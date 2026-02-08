import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { collectFromSource, collectAllSources } from "./services/rss";
import { startScheduler, stopScheduler, getSchedulerStatus, runCollectNow, runAnalyzeNow, runDraftNow, runDailyBriefNow, runReportNow } from "./jobs/scheduler";
import { parseCommand } from "./chat/command-parser";
import { routeCommand, execPipelineRun } from "./chat/commandRouter";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./replit_integrations/auth";
import { runAllSeeds } from "./seed";

function getUserId(req: Request): string | undefined {
  const user = req.user as any;
  return user?.claims?.sub;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Run seeds on startup
  await runAllSeeds();
  
  // Setup auth BEFORE registering other routes
  await setupAuth(app);
  registerAuthRoutes(app);
  
  // All API routes below require authentication
  app.get("/api/stats", isAuthenticated, async (req, res) => {
    try {
      const stats = await storage.getStats();
      res.json(stats);
    } catch (error) {
      console.error("Error getting stats:", error);
      res.status(500).json({ error: "Failed to get stats" });
    }
  });

  app.get("/api/items/recent", isAuthenticated, async (req, res) => {
    try {
      const items = await storage.getRecentItems(10);
      res.json(items);
    } catch (error) {
      console.error("Error getting recent items:", error);
      res.status(500).json({ error: "Failed to get recent items" });
    }
  });

  app.get("/api/items/observe", isAuthenticated, async (req, res) => {
    try {
      const items = await storage.getObserveItems(50);
      res.json(items);
    } catch (error) {
      console.error("Error getting observe items:", error);
      res.status(500).json({ error: "Failed to get observe items" });
    }
  });

  app.get("/api/items", isAuthenticated, async (req, res) => {
    try {
      const status = req.query.status as string | undefined;
      const items = await storage.getItems(status);
      res.json(items);
    } catch (error) {
      console.error("Error getting items:", error);
      res.status(500).json({ error: "Failed to get items" });
    }
  });

  app.get("/api/items/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const item = await storage.getItem(id);
      if (!item) {
        return res.status(404).json({ error: "Item not found" });
      }
      res.json(item);
    } catch (error) {
      console.error("Error getting item:", error);
      res.status(500).json({ error: "Failed to get item" });
    }
  });

  app.post("/api/items/:id/skip", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.updateItemStatus(id, "skipped");
      res.json({ success: true });
    } catch (error) {
      console.error("Error skipping item:", error);
      res.status(500).json({ error: "Failed to skip item" });
    }
  });

  app.post("/api/items/:id/reanalyze", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.updateItemStatus(id, "new");
      res.json({ success: true });
    } catch (error) {
      console.error("Error setting item for reanalysis:", error);
      res.status(500).json({ error: "Failed to set for reanalysis" });
    }
  });

  app.get("/api/sources", isAuthenticated, async (req, res) => {
    try {
      const sources = await storage.getSources();
      res.json(sources);
    } catch (error) {
      console.error("Error getting sources:", error);
      res.status(500).json({ error: "Failed to get sources" });
    }
  });

  app.post("/api/sources", isAuthenticated, async (req, res) => {
    try {
      const { name, url, type = "rss", topic = "ai_art", trustLevel = "medium", region = "global" } = req.body;
      if (!name || !url) {
        return res.status(400).json({ error: "Name and URL are required" });
      }
      const source = await storage.createSource({ name, url, type, topic, trustLevel, region });
      res.status(201).json(source);
    } catch (error: any) {
      if (error.code === "23505") {
        return res.status(400).json({ error: "A source with this URL already exists" });
      }
      console.error("Error creating source:", error);
      res.status(500).json({ error: "Failed to create source" });
    }
  });

  app.patch("/api/sources/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const source = await storage.updateSource(id, req.body);
      if (!source) {
        return res.status(404).json({ error: "Source not found" });
      }
      res.json(source);
    } catch (error) {
      console.error("Error updating source:", error);
      res.status(500).json({ error: "Failed to update source" });
    }
  });

  app.delete("/api/sources/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteSource(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting source:", error);
      res.status(500).json({ error: "Failed to delete source" });
    }
  });

  app.post("/api/sources/:id/collect", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const source = await storage.getSource(id);
      if (!source) {
        return res.status(404).json({ error: "Source not found" });
      }
      const count = await collectFromSource(id, source.url);
      res.json({ collected: count });
    } catch (error) {
      console.error("Error collecting from source:", error);
      res.status(500).json({ error: "Failed to collect from source" });
    }
  });

  app.get("/api/drafts", isAuthenticated, async (req, res) => {
    try {
      const decision = req.query.decision as string | undefined;
      const drafts = await storage.getDrafts(decision);
      res.json(drafts);
    } catch (error) {
      console.error("Error getting drafts:", error);
      res.status(500).json({ error: "Failed to get drafts" });
    }
  });

  app.post("/api/drafts/:id/approve", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { finalText } = req.body;
      await storage.updateDraftDecision(id, "approved", finalText);
      res.json({ success: true });
    } catch (error) {
      console.error("Error approving draft:", error);
      res.status(500).json({ error: "Failed to approve draft" });
    }
  });

  app.post("/api/drafts/:id/reject", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.updateDraftDecision(id, "rejected");
      res.json({ success: true });
    } catch (error) {
      console.error("Error rejecting draft:", error);
      res.status(500).json({ error: "Failed to reject draft" });
    }
  });

  app.get("/api/scheduler/status", isAuthenticated, async (req, res) => {
    try {
      const status = getSchedulerStatus();
      res.json(status);
    } catch (error) {
      console.error("Error getting scheduler status:", error);
      res.status(500).json({ error: "Failed to get scheduler status" });
    }
  });

  app.post("/api/scheduler/start", isAuthenticated, async (req, res) => {
    try {
      startScheduler();
      res.json({ success: true, isRunning: true });
    } catch (error) {
      console.error("Error starting scheduler:", error);
      res.status(500).json({ error: "Failed to start scheduler" });
    }
  });

  app.post("/api/scheduler/stop", isAuthenticated, async (req, res) => {
    try {
      stopScheduler();
      res.json({ success: true, isRunning: false });
    } catch (error) {
      console.error("Error stopping scheduler:", error);
      res.status(500).json({ error: "Failed to stop scheduler" });
    }
  });

  app.post("/api/scheduler/run/collect", isAuthenticated, async (req, res) => {
    try {
      const result = await runCollectNow();
      res.json(result);
    } catch (error) {
      console.error("Error running collect:", error);
      res.status(500).json({ error: "Failed to run collect" });
    }
  });

  app.post("/api/scheduler/run/analyze", isAuthenticated, async (req, res) => {
    try {
      const count = await runAnalyzeNow();
      res.json({ analyzed: count });
    } catch (error: any) {
      console.error("Error running analyze:", error);
      const msg = error?.message?.includes("LLM_API_KEY")
        ? "AI key not configured. Please add an AI Provider in Settings."
        : "Analysis failed. Please try again later.";
      res.status(500).json({ error: msg });
    }
  });

  app.post("/api/scheduler/run/draft", isAuthenticated, async (req, res) => {
    try {
      const count = await runDraftNow();
      res.json({ drafted: count });
    } catch (error: any) {
      console.error("Error running draft:", error);
      const msg = error?.message?.includes("LLM_API_KEY")
        ? "AI key not configured. Please add an AI Provider in Settings."
        : "Draft generation failed. Please try again later.";
      res.status(500).json({ error: msg });
    }
  });

  app.get("/api/reports", isAuthenticated, async (req, res) => {
    try {
      const userId = (req as any).user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const profileIdParam = req.query.profileId;
      const fromParam = req.query.from;
      const toParam = req.query.to;

      const from = fromParam ? new Date(fromParam as string) : undefined;
      const to = toParam ? new Date(toParam as string) : undefined;

      if (profileIdParam) {
        const profileId = parseInt(profileIdParam as string);
        
        const profile = await storage.getProfile(profileId, userId);
        if (!profile) {
          return res.status(404).json({ error: "Profile not found" });
        }

        const outputs = await storage.listOutputs({ userId, profileId, from, to });
        return res.json(outputs);
      }

      const outputs = await storage.listOutputs({ userId, from, to });
      res.json(outputs);
    } catch (error) {
      console.error("Error getting reports:", error);
      res.status(500).json({ error: "Failed to get reports" });
    }
  });

  app.get("/api/reports/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = (req as any).user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const outputId = parseInt(req.params.id);
      const output = await storage.getOutputById({ userId, outputId });
      
      if (!output) {
        return res.status(404).json({ error: "Report not found" });
      }

      res.json(output);
    } catch (error) {
      console.error("Error getting report:", error);
      res.status(500).json({ error: "Failed to get report" });
    }
  });

  app.post("/api/debug/generate-daily-brief", isAuthenticated, async (req, res) => {
    try {
      const topic = req.body?.topic || "ai_art";
      const result = await runDailyBriefNow(topic);
      res.json({ ok: true, reportId: result.id, itemsCount: result.itemsCount, topic });
    } catch (error: any) {
      console.error("Error generating daily brief:", error);
      const msg = error?.message?.includes("LLM_API_KEY")
        ? "AI key not configured. Please add an AI Provider in Settings."
        : `Daily brief generation failed: ${error?.message ?? "Unknown error"}`;
      res.status(500).json({ ok: false, error: msg });
    }
  });

  app.post("/api/reports/generate", isAuthenticated, async (req, res) => {
    try {
      const userId = (req as any).user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ ok: false, error: "Unauthorized" });
      }

      let profileId = req.body?.profileId ? parseInt(req.body.profileId) : undefined;
      const botId = req.body?.botId ? parseInt(req.body.botId) : undefined;

      if (!profileId && botId) {
        const bot = await storage.getBot(botId, userId);
        if (!bot) {
          return res.status(404).json({ ok: false, error: "Bot not found" });
        }
        let profile = await storage.getProfileByUserAndTopic(userId, bot.key);
        if (!profile) {
          const allPresets = await storage.listPresets();
          const reportPresets = allPresets.filter(p => p.outputType === "report");
          const matchingPreset = reportPresets.find(p => {
            const variants = (p.variantsJson as string[]) || [];
            return variants.includes(bot.key) || p.key === bot.key;
          }) || reportPresets[0];

          if (!matchingPreset) {
            return res.status(400).json({ ok: false, error: "No report template found." });
          }

          const settings = bot.settings;
          const scheduleCron = settings
            ? `${settings.scheduleTimeLocal?.split(":")[1] || "0"} ${settings.scheduleTimeLocal?.split(":")[0] || "7"} * * ${settings.scheduleRule === "WEEKDAYS" ? "1-5" : settings.scheduleRule === "WEEKENDS" ? "0,6" : "*"}`
            : "0 7 * * *";

          profile = await storage.createProfile({
            userId,
            presetId: matchingPreset.id,
            name: bot.name,
            topic: bot.key,
            timezone: settings?.timezone || "Asia/Seoul",
            scheduleCron,
            configJson: {
              sections: settings?.sectionsJson || { tldr: true, drivers: true, risk: true, checklist: true, sources: true },
              filters: settings?.filtersJson || { minImportanceScore: 0 },
              verbosity: settings?.verbosity || "normal",
              markdownLevel: settings?.markdownLevel || "minimal",
              scheduleRule: settings?.scheduleRule || "DAILY",
              scheduleTimeLocal: settings?.scheduleTimeLocal || "07:00",
            },
            isActive: bot.isEnabled,
          });

          const botSources = await storage.getBotSources(botId);
          if (botSources.length === 0) {
            await storage.deleteProfile(profile.id, userId);
            return res.status(400).json({ ok: false, error: "This bot has no sources. Please add sources first from the Sources page or using the Console." });
          }
          await storage.setProfileSources(
            profile.id,
            userId,
            botSources.map(s => ({ sourceId: s.id, weight: s.weight, isEnabled: s.isEnabled }))
          );
        }
        profileId = profile.id;
      }
      
      if (!profileId) {
        return res.status(400).json({ ok: false, error: "profileId or botId is required" });
      }

      const profile = await storage.getProfile(profileId, userId);
      if (!profile) {
        return res.status(404).json({ ok: false, error: "Profile not found" });
      }

      const result = await runReportNow(profileId, userId);
      res.json({ ok: true, result });
    } catch (error: any) {
      console.error("Error generating report:", error);
      let msg = error?.message ?? "Unknown error";
      if (msg.includes("LLM_API_KEY")) {
        msg = "AI key not configured. Please add an AI Provider in Settings.";
      } else if (msg.includes("No sources linked")) {
        msg = "This bot has no sources linked. Please add sources first from the Sources page.";
      }
      const statusCode = msg.includes("sources") || msg.includes("AI key") ? 400 : 500;
      res.status(statusCode).json({ ok: false, error: msg });
    }
  });

  app.post("/api/chat/threads", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "Not authenticated" });
      const thread = await storage.createThread(userId);
      res.json(thread);
    } catch (error) {
      console.error("Error creating thread:", error);
      res.status(500).json({ error: "Failed to create thread" });
    }
  });

  app.get("/api/chat/threads", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "Not authenticated" });
      const threads = await storage.getUserThreads(userId);
      res.json(threads);
    } catch (error) {
      console.error("Error listing threads:", error);
      res.status(500).json({ error: "Failed to list threads" });
    }
  });

  app.get("/api/chat/threads/:threadId/messages", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "Not authenticated" });
      const threadId = parseInt(req.params.threadId, 10);
      if (isNaN(threadId)) return res.status(400).json({ error: "Invalid threadId" });

      const thread = await storage.getThread(threadId, userId);
      if (!thread) return res.status(404).json({ error: "Thread not found" });

      const messages = await storage.listThreadMessages(threadId, userId, 100);
      res.json(messages.reverse());
    } catch (error) {
      console.error("Error getting thread messages:", error);
      res.status(500).json({ error: "Failed to get thread messages" });
    }
  });

  app.post("/api/chat/threads/:threadId/message", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "Not authenticated" });
      const threadId = parseInt(req.params.threadId, 10);
      if (isNaN(threadId)) return res.status(400).json({ error: "Invalid threadId" });

      const thread = await storage.getThread(threadId, userId);
      if (!thread) return res.status(404).json({ error: "Thread not found" });

      const { text } = req.body;
      if (!text || typeof text !== "string") {
        return res.status(400).json({ error: "text is required" });
      }

      await storage.addThreadMessage({
        threadId,
        userId,
        role: "user",
        contentText: text,
        kind: "text",
      });

      const userBots = await storage.listBots(userId);
      let activeBotKey: string | null = null;
      if (thread.activeBotId) {
        const activeBot = userBots.find(b => b.id === thread.activeBotId);
        activeBotKey = activeBot?.key || null;
      }

      const parseResult = await parseCommand(text, {
        activeBotKey,
        availableBotKeys: userBots.map(b => b.key),
      });

      const { command, clarificationNeeded, clarificationText } = parseResult;

      if (clarificationNeeded) {
        await storage.addThreadMessage({
          threadId,
          userId,
          role: "assistant",
          contentText: clarificationText || "Could you be more specific?",
          kind: "text",
        });
        return res.json({ ok: true, mode: "clarification", clarificationText });
      }

      if (command.needsConfirm && command.type !== "chat") {
        const confirmMsg = await storage.addThreadMessage({
          threadId,
          userId,
          role: "assistant",
          contentText: command.confirmText || `Run '${command.type}'?`,
          kind: "pending_command",
          commandJson: command,
          status: "pending_confirm",
        });
        return res.json({
          ok: true,
          mode: "confirm",
          pendingMessageId: confirmMsg.id,
          command,
          confirmText: command.confirmText,
        });
      }

      const result = await routeCommand(userId, command, threadId);

      await storage.addThreadMessage({
        threadId,
        userId,
        role: "assistant",
        contentText: result.assistantMessage,
        kind: "command_result",
        commandJson: result.executed,
        resultJson: result.result,
      });

      res.json({ ok: result.ok, mode: "executed", result });
    } catch (error: any) {
      console.error("Error processing chat message:", error);
      res.status(500).json({ ok: false, error: error?.message ?? String(error) });
    }
  });

  app.post("/api/chat/threads/:threadId/confirm", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "Not authenticated" });
      const threadId = parseInt(req.params.threadId, 10);
      if (isNaN(threadId)) return res.status(400).json({ error: "Invalid threadId" });

      const thread = await storage.getThread(threadId, userId);
      if (!thread) return res.status(404).json({ error: "Thread not found" });

      const { pendingMessageId, approve } = req.body;
      if (!pendingMessageId) return res.status(400).json({ error: "pendingMessageId is required" });

      const messages = await storage.listThreadMessages(threadId, userId, 200);
      const pendingMsg = messages.find(m => m.id === pendingMessageId && m.status === "pending_confirm");

      if (!pendingMsg) {
        return res.status(404).json({ error: "Pending confirmation not found or already resolved" });
      }

      await storage.updateChatMessageStatus(pendingMessageId, userId, approve ? "confirmed" : "cancelled");

      if (!approve) {
        await storage.addThreadMessage({
          threadId,
          userId,
          role: "assistant",
          contentText: "Cancelled.",
          kind: "text",
        });
        return res.json({ ok: true, cancelled: true });
      }

      const command = pendingMsg.commandJson as any;

      if (command.type === "pipeline_run") {
        res.json({ ok: true, mode: "pipeline_started" });

        const result = await execPipelineRun(userId, command, async (step) => {
          await storage.addThreadMessage({
            threadId,
            userId,
            role: "assistant",
            contentText: step.message,
            kind: "command_result",
            commandJson: { type: "pipeline_step", step: step.step },
            resultJson: { ok: step.ok, data: step.data },
          });
        });

        await storage.addThreadMessage({
          threadId,
          userId,
          role: "assistant",
          contentText: result.assistantMessage,
          kind: "command_result",
          commandJson: result.executed,
          resultJson: result.result,
        });

        await storage.clearPendingCommand(pendingMessageId, userId);
        return;
      }

      const result = await routeCommand(userId, command, threadId);

      await storage.addThreadMessage({
        threadId,
        userId,
        role: "assistant",
        contentText: result.assistantMessage,
        kind: "command_result",
        commandJson: result.executed,
        resultJson: result.result,
      });

      await storage.clearPendingCommand(pendingMessageId, userId);

      res.json({ ok: result.ok, result });
    } catch (error: any) {
      console.error("Error confirming chat command:", error);
      res.status(500).json({ ok: false, error: error?.message ?? String(error) });
    }
  });

  // ============================================
  // PRESETS API
  // ============================================
  app.get("/api/presets", isAuthenticated, async (_req, res) => {
    try {
      const presetList = await storage.listPresets();
      res.json(presetList);
    } catch (error) {
      console.error("Error getting presets:", error);
      res.status(500).json({ error: "Failed to get presets" });
    }
  });

  // ============================================
  // PROFILES API
  // ============================================
  app.get("/api/profiles", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "Unauthorized" });
      
      const profileList = await storage.listProfiles(userId);
      res.json(profileList);
    } catch (error) {
      console.error("Error getting profiles:", error);
      res.status(500).json({ error: "Failed to get profiles" });
    }
  });

  app.post("/api/profiles", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "Unauthorized" });
      
      const { presetId, name, topic, variantKey, timezone, scheduleCron, configJson, isActive } = req.body;
      
      if (!presetId || !name || !topic) {
        return res.status(400).json({ error: "presetId, name, and topic are required" });
      }

      const profile = await storage.createProfile({
        userId,
        presetId,
        name,
        topic,
        variantKey: variantKey || null,
        timezone: timezone || "Asia/Seoul",
        scheduleCron: scheduleCron || "0 7 * * *",
        configJson: configJson || {},
        isActive: isActive ?? true,
      });
      res.json(profile);
    } catch (error) {
      console.error("Error creating profile:", error);
      res.status(500).json({ error: "Failed to create profile" });
    }
  });

  app.get("/api/profiles/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "Unauthorized" });
      
      const id = parseInt(req.params.id);
      const profile = await storage.getProfile(id, userId);
      
      if (!profile) {
        return res.status(404).json({ error: "Profile not found" });
      }
      
      res.json(profile);
    } catch (error) {
      console.error("Error getting profile:", error);
      res.status(500).json({ error: "Failed to get profile" });
    }
  });

  app.put("/api/profiles/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "Unauthorized" });
      
      const id = parseInt(req.params.id);
      const { name, isActive, timezone, scheduleCron, configJson } = req.body;
      
      const profile = await storage.updateProfile(id, userId, {
        name,
        isActive,
        timezone,
        scheduleCron,
        configJson,
      });
      
      if (!profile) {
        return res.status(404).json({ error: "Profile not found" });
      }
      
      res.json(profile);
    } catch (error) {
      console.error("Error updating profile:", error);
      res.status(500).json({ error: "Failed to update profile" });
    }
  });

  app.delete("/api/profiles/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "Unauthorized" });
      
      const id = parseInt(req.params.id);
      await storage.deleteProfile(id, userId);
      res.json({ ok: true });
    } catch (error) {
      console.error("Error deleting profile:", error);
      res.status(500).json({ error: "Failed to delete profile" });
    }
  });

  app.post("/api/profiles/:id/clone", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "Unauthorized" });
      
      const id = parseInt(req.params.id);
      const cloned = await storage.cloneProfile(id, userId);
      
      if (!cloned) {
        return res.status(404).json({ error: "Profile not found" });
      }
      
      res.json(cloned);
    } catch (error) {
      console.error("Error cloning profile:", error);
      res.status(500).json({ error: "Failed to clone profile" });
    }
  });

  // ============================================
  // PROFILE-SOURCES API
  // ============================================
  app.get("/api/profiles/:id/sources", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "Unauthorized" });
      
      const profileId = parseInt(req.params.id);
      const sources = await storage.getProfileSources(profileId, userId);
      res.json(sources);
    } catch (error) {
      console.error("Error getting profile sources:", error);
      res.status(500).json({ error: "Failed to get profile sources" });
    }
  });

  app.put("/api/profiles/:id/sources", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "Unauthorized" });
      
      const profileId = parseInt(req.params.id);
      const { sourceIds, sources: sourcesWithWeight } = req.body;
      
      // Support both formats: simple sourceIds array or sources with weight
      let sourceData: Array<{ sourceId: number; weight?: number; isEnabled?: boolean }>;
      
      if (sourcesWithWeight && Array.isArray(sourcesWithWeight)) {
        // New format: [{ sourceId, weight, isEnabled }]
        sourceData = sourcesWithWeight;
      } else if (sourceIds && Array.isArray(sourceIds)) {
        // Legacy format: [1, 2, 3] - convert to new format with default weight
        sourceData = sourceIds.map((id: number) => ({ sourceId: id }));
      } else {
        return res.status(400).json({ error: "sourceIds or sources must be an array" });
      }
      
      await storage.setProfileSources(profileId, userId, sourceData);
      res.json({ ok: true });
    } catch (error) {
      console.error("Error setting profile sources:", error);
      res.status(500).json({ error: "Failed to set profile sources" });
    }
  });

  // ============================================
  // BOTS API (Step 8-2)
  // ============================================

  app.get("/api/bots", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "Unauthorized" });
      const botList = await storage.listBots(userId);
      res.json({ bots: botList });
    } catch (error) {
      console.error("Error listing bots:", error);
      res.status(500).json({ error: "Failed to list bots" });
    }
  });

  app.post("/api/bots/from-preset", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const { presetId, name, topic, selectedSourceUrls, customSources } = req.body;
      if (!presetId || !name || !topic) {
        return res.status(400).json({ error: "presetId, name, and topic are required." });
      }

      const preset = await storage.getPresetById(presetId);
      if (!preset) return res.status(404).json({ error: "Preset not found." });

      const config = (preset.defaultConfigJson || {}) as any;

      const validSourceUrls = Array.isArray(selectedSourceUrls) ? selectedSourceUrls : [];
      const sourceData = validSourceUrls
        .map((url: string) => config.suggestedSources?.find((s: any) => s.url === url))
        .filter(Boolean)
        .map((s: any) => ({ name: s.name, url: s.url, type: s.type || "rss", topic: s.topic || topic }));

      if (Array.isArray(customSources)) {
        for (const cs of customSources) {
          if (cs.url && !sourceData.some((s: any) => s.url === cs.url)) {
            try {
              new URL(cs.url);
              sourceData.push({ name: cs.name || new URL(cs.url).hostname, url: cs.url, type: "rss", topic: cs.topic || topic });
            } catch {}
          }
        }
      }

      const botTimezone = config.timezone || "Asia/Seoul";
      const botScheduleRule = config.scheduleRule || "DAILY";
      const botScheduleTime = config.scheduleTimeLocal || "07:00";
      const botFilters = {
        ...(config.filters || { minImportanceScore: 0 }),
        ...(config.requireHumanApproval !== undefined && { requireHumanApproval: config.requireHumanApproval }),
        ...(config.promotionLevel && { promotionLevel: config.promotionLevel }),
        ...(config.linkPolicy && { linkPolicy: config.linkPolicy }),
      };

      const bot = await storage.createBotFromPreset({
        userId,
        key: topic,
        name: String(name).trim(),
        settings: {
          timezone: botTimezone,
          scheduleRule: botScheduleRule,
          scheduleTimeLocal: botScheduleTime,
          format: "clean",
          markdownLevel: config.markdownLevel || "minimal",
          verbosity: config.verbosity || "normal",
          sectionsJson: config.sections || { tldr: true, drivers: true, risk: true, checklist: true, sources: true },
          filtersJson: botFilters,
        },
        sourceData,
      });

      const timeParts = botScheduleTime.split(":");
      const cronMinute = timeParts[1] || "0";
      const cronHour = timeParts[0] || "7";
      const cronDow = botScheduleRule === "WEEKDAYS" ? "1-5" : botScheduleRule === "WEEKENDS" ? "0,6" : "*";
      const scheduleCron = `${cronMinute} ${cronHour} * * ${cronDow}`;

      const newProfile = await storage.createProfile({
        userId,
        presetId,
        name: String(name).trim(),
        topic,
        timezone: botTimezone,
        scheduleCron,
        configJson: {
          sections: config.sections || {},
          filters: botFilters,
          verbosity: config.verbosity || "normal",
          markdownLevel: config.markdownLevel || "minimal",
        },
        isActive: true,
      });

      const botSources = await storage.getBotSources(bot.id);
      if (botSources.length > 0) {
        await storage.setProfileSources(
          newProfile.id,
          userId,
          botSources.map(s => ({ sourceId: s.id, weight: s.weight, isEnabled: s.isEnabled }))
        );
      }

      const full = await storage.getBot(bot.id, userId);
      res.json({ bot: full });
    } catch (error: any) {
      if (error?.code === '23505') {
        return res.status(409).json({ error: "A bot with this topic already exists. Please choose a different topic." });
      }
      console.error("Error creating bot from preset:", error);
      res.status(500).json({ error: "Bot creation failed. Please try again later." });
    }
  });

  app.post("/api/bots", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "Unauthorized" });
      const { name, key, description } = req.body;
      if (!name || !key) return res.status(400).json({ error: "name and key are required" });

      const bot = await storage.createBot({ userId, key, name, isEnabled: true });
      await storage.createBotSettings({ botId: bot.id } as any);
      const full = await storage.getBot(bot.id, userId);
      res.json({ bot: full });
    } catch (error: any) {
      if (error?.code === '23505') {
        return res.status(409).json({ error: "A bot with this key already exists" });
      }
      console.error("Error creating bot:", error);
      res.status(500).json({ error: "Failed to create bot" });
    }
  });

  app.get("/api/bots/:botId", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "Unauthorized" });
      const botId = parseInt(req.params.botId);
      if (isNaN(botId)) return res.status(400).json({ error: "Invalid botId" });

      const bot = await storage.getBot(botId, userId);
      if (!bot) return res.status(404).json({ error: "Bot not found" });
      res.json({ bot });
    } catch (error) {
      console.error("Error getting bot:", error);
      res.status(500).json({ error: "Failed to get bot" });
    }
  });

  app.patch("/api/bots/:botId", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "Unauthorized" });
      const botId = parseInt(req.params.botId);
      if (isNaN(botId)) return res.status(400).json({ error: "Invalid botId" });

      const bot = await storage.updateBot(botId, userId, req.body);
      if (!bot) return res.status(404).json({ error: "Bot not found" });
      res.json({ bot });
    } catch (error) {
      console.error("Error updating bot:", error);
      res.status(500).json({ error: "Failed to update bot" });
    }
  });

  app.delete("/api/bots/:botId", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "Unauthorized" });
      const botId = parseInt(req.params.botId);
      if (isNaN(botId)) return res.status(400).json({ error: "Invalid botId" });

      await storage.deleteBot(botId, userId);
      res.json({ ok: true });
    } catch (error) {
      console.error("Error deleting bot:", error);
      res.status(500).json({ error: "Failed to delete bot" });
    }
  });

  // Bot Settings
  app.get("/api/bots/:botId/settings", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "Unauthorized" });
      const botId = parseInt(req.params.botId);
      if (isNaN(botId)) return res.status(400).json({ error: "Invalid botId" });

      const bot = await storage.getBot(botId, userId);
      if (!bot) return res.status(404).json({ error: "Bot not found" });

      const settings = await storage.getBotSettings(botId);
      res.json({ settings: settings ?? null });
    } catch (error) {
      console.error("Error getting bot settings:", error);
      res.status(500).json({ error: "Failed to get bot settings" });
    }
  });

  app.put("/api/bots/:botId/settings", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "Unauthorized" });
      const botId = parseInt(req.params.botId);
      if (isNaN(botId)) return res.status(400).json({ error: "Invalid botId" });

      const settings = await storage.upsertBotSettings(userId, botId, req.body);
      res.json({ settings });
    } catch (error: any) {
      if (error.message?.includes("not found")) {
        return res.status(404).json({ error: "Bot not found." });
      }
      console.error("Error saving bot settings:", error);
      res.status(500).json({ error: "Settings save failed. Please try again later." });
    }
  });

  // Bot Sources
  app.get("/api/bots/:botId/sources", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "Unauthorized" });
      const botId = parseInt(req.params.botId);
      if (isNaN(botId)) return res.status(400).json({ error: "Invalid botId" });

      const bot = await storage.getBot(botId, userId);
      if (!bot) return res.status(404).json({ error: "Bot not found" });

      const botSources = await storage.getBotSources(botId);
      res.json({ links: botSources });
    } catch (error) {
      console.error("Error getting bot sources:", error);
      res.status(500).json({ error: "Failed to get bot sources" });
    }
  });

  app.put("/api/bots/:botId/sources", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "Unauthorized" });
      const botId = parseInt(req.params.botId);
      if (isNaN(botId)) return res.status(400).json({ error: "Invalid botId" });

      const { links } = req.body;
      if (!Array.isArray(links)) return res.status(400).json({ error: "links must be an array" });

      await storage.setBotSources(botId, userId, links);
      res.json({ ok: true });
    } catch (error: any) {
      if (error.message?.includes("not found") || error.message?.includes("not accessible")) {
        return res.status(400).json({ error: error.message });
      }
      console.error("Error setting bot sources:", error);
      res.status(500).json({ error: "Failed to set bot sources" });
    }
  });

  // ============================================
  // LLM PROVIDERS API (Phase 3)
  // ============================================
  app.get("/api/llm-providers", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "Unauthorized" });
      const providers = await storage.listLlmProviders(userId);
      const safe = providers.map(p => ({ ...p, apiKeyEncrypted: undefined, apiKeyHint: p.apiKeyEncrypted ? "****" : "" }));
      res.json({ providers: safe });
    } catch (error) {
      console.error("Error listing LLM providers:", error);
      res.status(500).json({ error: "Failed to list LLM providers" });
    }
  });

  app.post("/api/llm-providers", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "Unauthorized" });
      const { name, providerType, apiKey, baseUrl, defaultModel } = req.body;
      if (!name || !providerType || !apiKey) {
        return res.status(400).json({ error: "name, providerType, and apiKey are required" });
      }
      const validTypes = ["openai", "anthropic", "google", "custom"];
      if (!validTypes.includes(providerType)) {
        return res.status(400).json({ error: `providerType must be one of: ${validTypes.join(", ")}` });
      }

      const { encrypt } = await import("./lib/crypto");
      const provider = await storage.createLlmProvider({
        userId,
        name,
        providerType,
        apiKeyEncrypted: encrypt(apiKey),
        baseUrl: baseUrl || null,
        defaultModel: defaultModel || null,
      });
      res.json({ provider: { ...provider, apiKeyEncrypted: undefined, apiKeyHint: "****" } });
    } catch (error) {
      console.error("Error creating LLM provider:", error);
      res.status(500).json({ error: "Failed to create LLM provider" });
    }
  });

  app.put("/api/llm-providers/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "Unauthorized" });
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: "Invalid provider id" });

      const { name, providerType, apiKey, baseUrl, defaultModel } = req.body;
      const patch: Record<string, any> = {};
      if (name !== undefined) patch.name = name;
      if (providerType !== undefined) patch.providerType = providerType;
      if (baseUrl !== undefined) patch.baseUrl = baseUrl;
      if (defaultModel !== undefined) patch.defaultModel = defaultModel;
      if (apiKey) {
        const { encrypt } = await import("./lib/crypto");
        patch.apiKeyEncrypted = encrypt(apiKey);
      }

      const provider = await storage.updateLlmProvider(id, userId, patch);
      if (!provider) return res.status(404).json({ error: "LLM provider not found" });
      res.json({ provider: { ...provider, apiKeyEncrypted: undefined, apiKeyHint: "****" } });
    } catch (error) {
      console.error("Error updating LLM provider:", error);
      res.status(500).json({ error: "Failed to update LLM provider" });
    }
  });

  app.delete("/api/llm-providers/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "Unauthorized" });
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: "Invalid provider id" });

      await storage.deleteLlmProvider(id, userId);
      res.json({ ok: true });
    } catch (error) {
      console.error("Error deleting LLM provider:", error);
      res.status(500).json({ error: "Failed to delete LLM provider" });
    }
  });

  // Bot LLM assignment
  app.put("/api/bots/:botId/settings/llm", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "Unauthorized" });
      const botId = parseInt(req.params.botId);
      if (isNaN(botId)) return res.status(400).json({ error: "Invalid botId" });

      const bot = await storage.getBot(botId, userId);
      if (!bot) return res.status(404).json({ error: "Bot not found" });

      const { llmProviderId, modelOverride } = req.body;

      if (llmProviderId != null) {
        const provider = await storage.getLlmProvider(llmProviderId, userId);
        if (!provider) return res.status(400).json({ error: "LLM provider not found or not yours" });
      }

      const settings = await storage.upsertBotSettings(userId, botId, {
        llmProviderId: llmProviderId ?? null,
        modelOverride: modelOverride ?? null,
      });
      res.json({ settings });
    } catch (error: any) {
      if (error.message?.includes("not found")) {
        return res.status(404).json({ error: error.message });
      }
      console.error("Error setting bot LLM:", error);
      res.status(500).json({ error: "Failed to set bot LLM" });
    }
  });

  // ============================================
  // SOURCES API (with userId support)
  // ============================================
  app.get("/api/user-sources", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "Unauthorized" });
      
      const topic = req.query.topic as string | undefined;
      const sourceList = await storage.listSources(userId, topic);
      res.json(sourceList);
    } catch (error) {
      console.error("Error getting sources:", error);
      res.status(500).json({ error: "Failed to get sources" });
    }
  });

  app.post("/api/user-sources", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "Unauthorized" });
      
      const { name, url, type, topic, enabled } = req.body;
      
      if (!name || !url || !topic) {
        return res.status(400).json({ error: "name, url, and topic are required" });
      }

      const source = await storage.createUserSource(userId, {
        name,
        url,
        type: type || "rss",
        topic,
        enabled: enabled ?? true,
      });
      res.json(source);
    } catch (error: any) {
      console.error("Error creating source:", error);
      if (error.code === "23505") {
        return res.status(400).json({ error: "Source with this URL already exists" });
      }
      res.status(500).json({ error: "Failed to create source" });
    }
  });

  app.put("/api/user-sources/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "Unauthorized" });
      
      const sourceId = parseInt(req.params.id);
      const { name, url, topic, enabled } = req.body;
      
      const source = await storage.updateUserSource(userId, sourceId, {
        name,
        url,
        topic,
        enabled,
      });
      
      if (!source) {
        return res.status(404).json({ error: "Source not found or not owned by user" });
      }
      
      res.json(source);
    } catch (error) {
      console.error("Error updating source:", error);
      res.status(500).json({ error: "Failed to update source" });
    }
  });

  app.delete("/api/user-sources/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "Unauthorized" });
      
      const sourceId = parseInt(req.params.id);
      await storage.deleteUserSource(userId, sourceId);
      res.json({ ok: true });
    } catch (error) {
      console.error("Error deleting source:", error);
      res.status(500).json({ error: "Failed to delete source" });
    }
  });

  return httpServer;
}
