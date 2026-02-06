import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { collectFromSource, collectAllSources } from "./services/rss";
import { startScheduler, stopScheduler, getSchedulerStatus, runCollectNow, runAnalyzeNow, runDraftNow, runDailyBriefNow, runReportNow } from "./jobs/scheduler";
import { parseCommand } from "./chat/command-parser";
import { executeCommand } from "./chat/executor";
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
        ? "AI 키가 설정되지 않았습니다. Settings에서 AI Provider를 추가하세요."
        : "분석 실행에 실패했습니다. 잠시 후 다시 시도해 주세요.";
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
        ? "AI 키가 설정되지 않았습니다. Settings에서 AI Provider를 추가하세요."
        : "초안 생성에 실패했습니다. 잠시 후 다시 시도해 주세요.";
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
        ? "AI 키가 설정되지 않았습니다. Settings에서 AI Provider를 추가하세요."
        : `데일리 브리프 생성에 실패했습니다: ${error?.message ?? "알 수 없는 오류"}`;
      res.status(500).json({ ok: false, error: msg });
    }
  });

  app.post("/api/reports/generate", isAuthenticated, async (req, res) => {
    try {
      const userId = (req as any).user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ ok: false, error: "Unauthorized" });
      }

      const profileId = req.body?.profileId ? parseInt(req.body.profileId) : undefined;
      
      if (!profileId) {
        return res.status(400).json({ ok: false, error: "profileId is required" });
      }

      const profile = await storage.getProfile(profileId, userId);
      if (!profile) {
        return res.status(404).json({ ok: false, error: "Profile not found" });
      }

      const result = await runReportNow(profileId, userId);
      res.json({ ok: true, result });
    } catch (error: any) {
      console.error("Error generating report:", error);
      const msg = error?.message?.includes("LLM_API_KEY")
        ? "AI 키가 설정되지 않았습니다. Settings에서 AI Provider를 추가하세요."
        : `리포트 생성에 실패했습니다: ${error?.message ?? "알 수 없는 오류"}`;
      res.status(500).json({ ok: false, error: msg });
    }
  });

  app.get("/api/chat/messages", isAuthenticated, async (req, res) => {
    try {
      const messages = await storage.getChatMessages(100);
      res.json(messages.reverse());
    } catch (error) {
      console.error("Error getting chat messages:", error);
      res.status(500).json({ error: "Failed to get chat messages" });
    }
  });

  app.post("/api/chat/command", isAuthenticated, async (req, res) => {
    try {
      const { message } = req.body;
      if (!message || typeof message !== "string") {
        return res.status(400).json({ error: "Message is required" });
      }

      await storage.createChatMessage({
        role: "user",
        contentText: message,
      });

      const defaultTopic = (await storage.getSetting("default_topic")) || "ai_art";
      const dailyBriefTime = (await storage.getSetting("daily_brief_time_kst")) || "22:00";

      const command = await parseCommand(message, {
        default_topic: defaultTopic,
        daily_brief_time_kst: dailyBriefTime,
      });

      const result = await executeCommand(command);

      await storage.createChatMessage({
        role: "assistant",
        contentText: result.assistantMessage,
        commandJson: result.executed,
        resultJson: result.result,
      });

      res.json(result);
    } catch (error: any) {
      console.error("Error processing chat command:", error);
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
        return res.status(400).json({ error: "presetId, name, topic 은 필수입니다." });
      }

      const preset = await storage.getPresetById(presetId);
      if (!preset) return res.status(404).json({ error: "프리셋을 찾을 수 없습니다." });

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

      const bot = await storage.createBotFromPreset({
        userId,
        key: topic,
        name: String(name).trim(),
        settings: {
          timezone: config.timezone || "Asia/Seoul",
          scheduleRule: config.scheduleRule || "DAILY",
          scheduleTimeLocal: config.scheduleTimeLocal || "07:00",
          format: "clean",
          markdownLevel: config.markdownLevel || "minimal",
          verbosity: config.verbosity || "normal",
          sectionsJson: config.sections || { tldr: true, drivers: true, risk: true, checklist: true, sources: true },
          filtersJson: config.filters || { minImportanceScore: 0 },
        },
        sourceData,
      });

      const full = await storage.getBot(bot.id, userId);
      res.json({ bot: full });
    } catch (error: any) {
      if (error?.code === '23505') {
        return res.status(409).json({ error: "이 토픽으로 이미 봇이 존재합니다. 다른 토픽을 선택하세요." });
      }
      console.error("Error creating bot from preset:", error);
      res.status(500).json({ error: "봇 생성에 실패했습니다. 잠시 후 다시 시도해 주세요." });
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
        return res.status(404).json({ error: "봇을 찾을 수 없습니다." });
      }
      console.error("Error saving bot settings:", error);
      res.status(500).json({ error: "설정 저장에 실패했습니다. 잠시 후 다시 시도해 주세요." });
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
