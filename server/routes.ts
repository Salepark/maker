import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { db, driver } from "./db";
import { jobRuns } from "@shared/schema";
import { and, eq, desc, gte, inArray } from "drizzle-orm";
import { collectFromSource, collectAllSources } from "./services/rss";
import { startScheduler, stopScheduler, getSchedulerStatus, runCollectNow, runAnalyzeNow, runDraftNow, runDailyBriefNow, runReportNow } from "./jobs/scheduler";
import { parseCommand } from "./chat/command-parser";
import { routeCommand, execPipelineRun } from "./chat/commandRouter";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./replit_integrations/auth";
import { runAllSeeds } from "./seed";
import { NotImplementedError, handleApiError } from "./lib/safe-storage";
import { PERMISSION_REQUEST_MESSAGES } from "@shared/permission-messages";
import { encrypt, decrypt } from "./lib/crypto";
import { setUserHasProviders } from "./llm/client";
import { registerTelegramWebhook, setupTelegramWebhook, startPolling, stopPolling } from "./adapters/telegram";

const isLocalMode = driver === "sqlite" && (
  process.env.NODE_ENV === "development" || process.env.MAKER_DESKTOP === "true"
);

function getUserId(req: Request): string | undefined {
  const user = req.user as any;
  return user?.claims?.sub;
}

const oneTimeApprovals = new Map<string, number>();

function getOneTimeKey(userId: string, permissionKey: string): string {
  return `${userId}:${permissionKey}`;
}

function hasOneTimeApproval(userId: string, permissionKey: string): boolean {
  const key = getOneTimeKey(userId, permissionKey);
  const expiry = oneTimeApprovals.get(key);
  if (!expiry) return false;
  if (Date.now() > expiry) {
    oneTimeApprovals.delete(key);
    return false;
  }
  oneTimeApprovals.delete(key);
  return true;
}

function grantOneTimeApproval(userId: string, permissionKey: string): void {
  const key = getOneTimeKey(userId, permissionKey);
  oneTimeApprovals.set(key, Date.now() + 60_000);
}

async function enforcePermission(
  req: Request,
  res: Response,
  permissionKey: string,
  action: string,
  botId?: number | null,
): Promise<boolean> {
  const userId = getUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }
  const { checkPermission, logPermissionAction } = await import("./policy/engine");
  const ctx = { userId, botId };
  const perm = await checkPermission(ctx, permissionKey as any);

  if (perm.allowed) return true;

  if (perm.requiresApproval && hasOneTimeApproval(userId, permissionKey)) {
    return true;
  }

  if (perm.requiresApproval) {
    const msg = PERMISSION_REQUEST_MESSAGES[permissionKey];
    await logPermissionAction(ctx, "APPROVAL_REQUESTED", permissionKey, { action });
    res.status(403).json({
      error: perm.reason,
      requiresApproval: true,
      permissionKey,
      action,
      botId: botId ?? null,
      message: msg || null,
    });
    return false;
  }

  await logPermissionAction(ctx, "PERMISSION_DENIED", permissionKey, { action });
  res.status(403).json({ error: perm.reason, requiresApproval: false });
  return false;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Run seeds on startup
  await runAllSeeds();

  // Initialize BYO LLM provider status at startup (for desktop single-user mode)
  try {
    const allProviders = await storage.listAllLlmProviders?.() ?? [];
    if (allProviders.length > 0) {
      setUserHasProviders(true);
      console.log(`[Init] Found ${allProviders.length} BYO LLM provider(s), marking LLM available`);
    }
  } catch {
    // listAllLlmProviders may not exist - fall back to lazy detection
  }

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, status: "ok", timestamp: new Date().toISOString(), driver });
  });

  await setupAuth(app);
  registerAuthRoutes(app);
  
  // All API routes below require authentication
  app.get("/api/stats", isAuthenticated, async (req, res) => {
    try {
      const userId = (req as any).user?.claims?.sub;
      const stats = await storage.getStats(userId);
      res.json(stats);
    } catch (error) {
      handleApiError(res, error, "Failed to get stats");
    }
  });

  app.get("/api/items/recent", isAuthenticated, async (req, res) => {
    try {
      const userId = (req as any).user?.claims?.sub;
      const items = await storage.getRecentItems(10, userId);
      res.json(items);
    } catch (error) {
      handleApiError(res, error, "Failed to get recent items");
    }
  });

  app.get("/api/items/observe", isAuthenticated, async (req, res) => {
    try {
      const userId = (req as any).user?.claims?.sub;
      const items = await storage.getObserveItems(50, userId);
      res.json(items);
    } catch (error) {
      handleApiError(res, error, "Failed to get observe items");
    }
  });

  app.get("/api/items", isAuthenticated, async (req, res) => {
    try {
      const userId = (req as any).user?.claims?.sub;
      const status = req.query.status as string | undefined;
      const items = await storage.getItems(status, userId);
      res.json(items);
    } catch (error) {
      handleApiError(res, error, "Failed to get items");
    }
  });

  app.get("/api/items/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = (req as any).user?.claims?.sub;
      const id = parseInt(req.params.id);
      const item = await storage.getItem(id, userId);
      if (!item) {
        return res.status(404).json({ error: "Item not found" });
      }
      res.json(item);
    } catch (error) {
      handleApiError(res, error, "Failed to get item");
    }
  });

  app.post("/api/items/:id/skip", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.updateItemStatus(id, "skipped");
      res.json({ success: true });
    } catch (error) {
      handleApiError(res, error, "Failed to skip item");
    }
  });

  app.post("/api/items/:id/reanalyze", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.updateItemStatus(id, "new");
      res.json({ success: true });
    } catch (error) {
      handleApiError(res, error, "Failed to set for reanalysis");
    }
  });

  app.get("/api/sources", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "Not authenticated" });
      const topic = req.query.topic as string | undefined;
      const userSources = await storage.listSources(userId, topic);
      res.json(userSources);
    } catch (error) {
      handleApiError(res, error, "Failed to get sources");
    }
  });

  app.get("/api/source-templates", isAuthenticated, async (req, res) => {
    try {
      const topic = req.query.topic as string | undefined;
      const templates = await storage.listSourceTemplates(topic);
      res.json(templates);
    } catch (error) {
      handleApiError(res, error, "Failed to get source templates");
    }
  });

  app.post("/api/source-templates/install", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "Not authenticated" });
      const { sourceIds } = req.body;
      if (!Array.isArray(sourceIds) || sourceIds.length === 0) {
        return res.status(400).json({ error: "sourceIds array required" });
      }
      const installed = await storage.installSourceTemplates(userId, sourceIds);
      res.json({ installed, count: installed.length });
    } catch (error) {
      handleApiError(res, error, "Failed to install source templates");
    }
  });

  app.post("/api/sources", isAuthenticated, async (req, res) => {
    try {
      if (!(await enforcePermission(req, res, "SOURCE_WRITE", "create_source"))) return;
      const { name, url, type = "rss", topic = "general", trustLevel = "medium", region = "global" } = req.body;
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
      if (!(await enforcePermission(req, res, "SOURCE_WRITE", "update_source"))) return;
      const id = parseInt(req.params.id);
      const source = await storage.updateSource(id, req.body);
      if (!source) {
        return res.status(404).json({ error: "Source not found" });
      }
      res.json(source);
    } catch (error) {
      handleApiError(res, error, "Failed to update source");
    }
  });

  app.delete("/api/sources/:id", isAuthenticated, async (req, res) => {
    try {
      if (!(await enforcePermission(req, res, "SOURCE_WRITE", "delete_source"))) return;
      const id = parseInt(req.params.id);
      await storage.deleteSource(id);
      res.status(204).send();
    } catch (error) {
      handleApiError(res, error, "Failed to delete source");
    }
  });

  app.post("/api/sources/:id/collect", isAuthenticated, async (req, res) => {
    try {
      if (!(await enforcePermission(req, res, "WEB_RSS", "collect_source"))) return;
      const id = parseInt(req.params.id);
      const source = await storage.getSource(id);
      if (!source) {
        return res.status(404).json({ error: "Source not found" });
      }
      const count = await collectFromSource(id, source.url, source.topic);
      res.json({ collected: count });
    } catch (error) {
      handleApiError(res, error, "Failed to collect from source");
    }
  });

  app.get("/api/drafts", isAuthenticated, async (req, res) => {
    try {
      const userId = (req as any).user?.claims?.sub;
      const decision = req.query.decision as string | undefined;
      const drafts = await storage.getDrafts(decision, userId);
      res.json(drafts);
    } catch (error) {
      handleApiError(res, error, "Failed to get drafts");
    }
  });

  app.post("/api/drafts/:id/approve", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { finalText } = req.body;
      await storage.updateDraftDecision(id, "approved", finalText);
      res.json({ success: true });
    } catch (error) {
      handleApiError(res, error, "Failed to approve draft");
    }
  });

  app.post("/api/drafts/:id/reject", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.updateDraftDecision(id, "rejected");
      res.json({ success: true });
    } catch (error) {
      handleApiError(res, error, "Failed to reject draft");
    }
  });

  app.get("/api/scheduler/status", isAuthenticated, async (req, res) => {
    try {
      const status = getSchedulerStatus();
      res.json(status);
    } catch (error) {
      handleApiError(res, error, "Failed to get scheduler status");
    }
  });

  app.post("/api/scheduler/start", isAuthenticated, async (req, res) => {
    try {
      startScheduler();
      res.json({ success: true, isRunning: true });
    } catch (error) {
      handleApiError(res, error, "Failed to start scheduler");
    }
  });

  app.post("/api/scheduler/stop", isAuthenticated, async (req, res) => {
    try {
      stopScheduler();
      res.json({ success: true, isRunning: false });
    } catch (error) {
      handleApiError(res, error, "Failed to stop scheduler");
    }
  });

  app.post("/api/scheduler/run/collect", isAuthenticated, async (req, res) => {
    try {
      const result = await runCollectNow();
      res.json(result);
    } catch (error) {
      handleApiError(res, error, "Failed to run collect");
    }
  });

  app.post("/api/scheduler/run/analyze", isAuthenticated, async (req, res) => {
    try {
      if (!(await enforcePermission(req, res, "LLM_USE", "analyze"))) return;
      const userId = getUserId(req);
      const { checkEgress, logPermissionAction } = await import("./policy/engine");
      const egress = await checkEgress({ userId }, "FULL_CONTENT_ALLOWED");
      if (!egress.allowed) {
        const msg = PERMISSION_REQUEST_MESSAGES["LLM_EGRESS_LEVEL"];
        await logPermissionAction({ userId }, "APPROVAL_REQUESTED", "LLM_EGRESS_LEVEL", { action: "analyze", requiredLevel: "FULL_CONTENT_ALLOWED", effectiveLevel: egress.effectiveLevel });
        return res.status(403).json({
          error: egress.reason,
          requiresApproval: true,
          permissionKey: "LLM_EGRESS_LEVEL",
          action: "analyze",
          message: msg || null,
        });
      }
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
      handleApiError(res, error, "Failed to get reports");
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
      handleApiError(res, error, "Failed to get report");
    }
  });

  app.post("/api/debug/generate-daily-brief", isAuthenticated, async (req, res) => {
    try {
      const topic = req.body?.topic || "general";
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

      const SERVER_TIMEOUT_MS = 120_000;
      const resultPromise = runReportNow(profileId, userId);
      const timeoutPromise = new Promise<null>((resolve) =>
        setTimeout(() => resolve(null), SERVER_TIMEOUT_MS)
      );

      const result = await Promise.race([resultPromise, timeoutPromise]);

      if (result === null) {
        res.json({
          ok: true,
          result: { timedOut: true },
          message: "Fast briefing delivered. Full analysis will continue in background.",
        });
      } else {
        res.json({ ok: true, result });
      }
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

  app.get("/api/console/context", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "Not authenticated" });

      const threadIdParam = req.query.threadId as string | undefined;
      const bots = await storage.listBots(userId);

      let activeBotId: number | null = null;
      let activeBotName: string | null = null;
      let activeBotTopic: string | null = null;
      let sourceCount = 0;
      let lastCollectedAt: string | null = null;
      let scheduleRule: string | null = null;
      let scheduleTimeLocal: string | null = null;
      let isEnabled = false;
      let hasLlmProvider = false;

      if (threadIdParam) {
        const thread = await storage.getThread(Number(threadIdParam), userId);
        if (thread?.activeBotId) {
          activeBotId = thread.activeBotId;
        }
      }

      if (!activeBotId && bots.length > 0) {
        activeBotId = bots[0].id;
      }

      if (activeBotId) {
        const bot = bots.find(b => b.id === activeBotId);
        if (bot) {
          activeBotName = bot.name;
          activeBotTopic = bot.key;
          isEnabled = bot.isEnabled;
          if (bot.settings) {
            scheduleRule = bot.settings.scheduleRule || null;
            scheduleTimeLocal = bot.settings.scheduleTimeLocal || null;
          }
          const sources = await storage.getBotSources(bot.id);
          sourceCount = sources.filter(s => s.isEnabled).length;

          const botLlm = await storage.resolveLLMForBot(bot.id);
          hasLlmProvider = !!botLlm || !!(process.env.LLM_API_KEY);
        }
      }

      const stats = await storage.getStats(userId);
      lastCollectedAt = stats.lastCollectAt;

      const providers = await storage.listLlmProviders(userId);
      const userHasProviders = providers.length > 0;
      setUserHasProviders(userHasProviders);

      res.json({
        botCount: bots.length,
        activeBotId,
        activeBotName,
        activeBotTopic,
        sourceCount,
        lastCollectedAt,
        scheduleRule,
        scheduleTimeLocal,
        isEnabled,
        hasLlmProvider: hasLlmProvider || userHasProviders,
        hasUserProviders: userHasProviders,
      });
    } catch (error) {
      handleApiError(res, error, "Failed to get console context");
    }
  });

  app.post("/api/chat/threads", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "Not authenticated" });
      const thread = await storage.createThread(userId);
      res.json(thread);
    } catch (error) {
      handleApiError(res, error, "Failed to create thread");
    }
  });

  app.get("/api/chat/threads", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "Not authenticated" });
      const threads = await storage.getUserThreads(userId);
      res.json(threads);
    } catch (error) {
      handleApiError(res, error, "Failed to list threads");
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
      handleApiError(res, error, "Failed to get thread messages");
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
      handleApiError(res, error, "Failed to get presets");
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
      handleApiError(res, error, "Failed to get profiles");
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
      handleApiError(res, error, "Failed to create profile");
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
      handleApiError(res, error, "Failed to get profile");
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
      handleApiError(res, error, "Failed to update profile");
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
      handleApiError(res, error, "Failed to delete profile");
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
      handleApiError(res, error, "Failed to clone profile");
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
      handleApiError(res, error, "Failed to get profile sources");
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
      handleApiError(res, error, "Failed to set profile sources");
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
      handleApiError(res, error, "Failed to list bots");
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
      const msg = error?.message || String(error);
      console.error("Error creating bot from preset:", msg, error?.stack);
      if (error?.code === 'SQLITE_CONSTRAINT_UNIQUE' || msg.includes('UNIQUE constraint')) {
        return res.status(409).json({ error: "A bot with this topic already exists. Please choose a different topic." });
      }
      res.status(500).json({ error: `Bot creation failed: ${msg}` });
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
      handleApiError(res, error, "Failed to get bot");
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
      handleApiError(res, error, "Failed to update bot");
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
      handleApiError(res, error, "Failed to delete bot");
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
      handleApiError(res, error, "Failed to get bot settings");
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
      handleApiError(res, error, "Failed to get bot sources");
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
      handleApiError(res, error, "Failed to list LLM providers");
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

      const { encrypt: enc } = await import("./lib/crypto");
      const encryptedKey = enc(apiKey);
      const provider = await storage.createLlmProvider({
        userId,
        name,
        providerType,
        apiKeyEncrypted: encryptedKey,
        baseUrl: baseUrl || null,
        defaultModel: defaultModel || null,
      });
      setUserHasProviders(true);
      res.json({ provider: { ...provider, apiKeyEncrypted: undefined, apiKeyHint: "****" } });
    } catch (error: any) {
      const msg = error?.message || String(error);
      console.error("[llm-provider] Create error:", msg, error?.stack);
      res.status(500).json({ error: `Failed to create LLM provider: ${msg}` });
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
        patch.apiKeyEncrypted = encrypt(apiKey);
      }

      const provider = await storage.updateLlmProvider(id, userId, patch);
      if (!provider) return res.status(404).json({ error: "LLM provider not found" });
      res.json({ provider: { ...provider, apiKeyEncrypted: undefined, apiKeyHint: "****" } });
    } catch (error) {
      handleApiError(res, error, "Failed to update LLM provider");
    }
  });

  app.delete("/api/llm-providers/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "Unauthorized" });
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: "Invalid provider id" });

      await storage.deleteLlmProvider(id, userId);
      const remaining = await storage.listLlmProviders(userId);
      setUserHasProviders(remaining.length > 0);
      res.json({ ok: true });
    } catch (error) {
      handleApiError(res, error, "Failed to delete LLM provider");
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
  // JOB RUNS / EXECUTION HISTORY API
  // ============================================
  app.get("/api/bots/:botId/runs", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "Unauthorized" });
      const botId = parseInt(req.params.botId);
      if (isNaN(botId)) return res.status(400).json({ error: "Invalid botId" });
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
      const runs = await storage.listJobRunsForBot(userId, botId, limit);
      res.json(runs);
    } catch (error) {
      handleApiError(res, error, "Failed to list job runs");
    }
  });

  app.get("/api/bots/:botId/last-run", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "Unauthorized" });
      const botId = parseInt(req.params.botId);
      if (isNaN(botId)) return res.status(400).json({ error: "Invalid botId" });
      const run = await storage.getLastJobRunForBot(userId, botId);
      res.json(run || null);
    } catch (error) {
      handleApiError(res, error, "Failed to get last run");
    }
  });

  app.get("/api/system/status", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "Unauthorized" });
      const bots = await storage.listBots(userId);
      const botStatuses = await Promise.all(
        bots.map(async (bot) => {
          const lastRun = await storage.getLastJobRunForBot(userId, bot.id);
          return {
            botId: bot.id,
            botName: bot.name,
            botKey: bot.key,
            isEnabled: bot.isEnabled,
            lastRun: lastRun ? {
              id: lastRun.id,
              status: lastRun.status,
              jobType: lastRun.jobType,
              trigger: lastRun.trigger,
              startedAt: lastRun.startedAt,
              finishedAt: lastRun.finishedAt,
              durationMs: lastRun.durationMs,
              itemsCollected: lastRun.itemsCollected,
              errorCode: lastRun.errorCode,
            } : null,
          };
        })
      );
      res.json({ bots: botStatuses, timestamp: new Date().toISOString() });
    } catch (error) {
      handleApiError(res, error, "Failed to get system status");
    }
  });

  app.get("/api/bots/:botId/diagnosis", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "Unauthorized" });
      const botId = parseInt(req.params.botId);
      if (isNaN(botId)) return res.status(400).json({ error: "Invalid botId" });
      const bot = await storage.getBot(botId, userId);
      if (!bot) return res.status(404).json({ error: "Bot not found" });

      const { diagnoseBot } = await import("./services/diagnostics");
      const diagnosis = await diagnoseBot(userId, bot);
      res.json(diagnosis);
    } catch (error) {
      handleApiError(res, error, "Failed to diagnose bot");
    }
  });

  app.get("/api/diagnostics", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "Unauthorized" });
      const bots = await storage.listBots(userId);
      const { diagnoseBot } = await import("./services/diagnostics");
      const results = await Promise.all(
        bots.map(async (bot) => ({
          botId: bot.id,
          botName: bot.name,
          botKey: bot.key,
          ...(await diagnoseBot(userId, bot)),
        }))
      );
      res.json(results);
    } catch (error) {
      handleApiError(res, error, "Failed to run diagnostics");
    }
  });

  // ============================================
  // DAILY LOOP RELIABILITY & TRENDS API
  // ============================================
  app.get("/api/diagnostics/daily-loop", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const runs = await db.select().from(jobRuns)
        .where(and(
          eq(jobRuns.userId, userId),
          gte(jobRuns.startedAt, sevenDaysAgo),
          inArray(jobRuns.jobType, ["report", "report_upgrade", "daily_brief"]),
        ))
        .orderBy(desc(jobRuns.startedAt));

      const fastRuns = runs.filter(r => r.reportStage === "fast" || r.jobType === "report" || r.jobType === "daily_brief");
      const total = fastRuns.length;
      const successes = fastRuns.filter(r => r.status === "ok" || r.status === "success").length;
      const successRate7d = total > 0 ? Math.round((successes / total) * 100) : 100;

      const durations = fastRuns.filter(r => r.durationMs != null && r.durationMs > 0).map(r => r.durationMs!);
      const avgGenerationTimeMs = durations.length > 0 ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0;

      const lastRun = runs[0];
      const failedRuns = runs.filter(r => r.status === "error" || r.status === "failed" || r.status === "timeout");
      const lastFailure = failedRuns[0];

      res.json({
        lastRunAt: lastRun?.startedAt || null,
        successRate7d,
        avgGenerationTimeMs,
        lastFailureReason: lastFailure?.errorMessage || null,
        totalRuns7d: total,
      });
    } catch (error) {
      handleApiError(res, error, "Failed to get daily loop diagnostics");
    }
  });

  app.get("/api/reports/:profileId/trends", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "Unauthorized" });
      const profileId = parseInt(req.params.profileId);
      if (isNaN(profileId)) return res.status(400).json({ error: "Invalid profileId" });

      const metrics = await storage.getReportMetricsForProfile(profileId, 7);

      if (metrics.length < 2) {
        return res.json({
          trendingUp: [],
          recurring: [],
          sourceShift: {},
          metrics,
          insufficient: true,
        });
      }

      const latest = metrics[0];
      const previous = metrics.slice(1);

      const latestKw = (latest.keywordSummary || {}) as Record<string, number>;
      const prevKwAgg: Record<string, number[]> = {};
      for (const m of previous) {
        const kw = (m.keywordSummary || {}) as Record<string, number>;
        for (const [k, v] of Object.entries(kw)) {
          if (!prevKwAgg[k]) prevKwAgg[k] = [];
          prevKwAgg[k].push(v);
        }
      }

      const trendingUp: string[] = [];
      const recurring: string[] = [];

      for (const [kw, count] of Object.entries(latestKw)) {
        const prev = prevKwAgg[kw];
        if (prev && prev.length >= 1) {
          const avg = prev.reduce((a, b) => a + b, 0) / prev.length;
          if (count > avg * 1.2) trendingUp.push(kw);
        }
      }

      const allKws: Record<string, number> = {};
      for (const m of metrics) {
        const kw = (m.keywordSummary || {}) as Record<string, number>;
        for (const k of Object.keys(kw)) {
          allKws[k] = (allKws[k] || 0) + 1;
        }
      }
      for (const [kw, appearances] of Object.entries(allKws)) {
        if (appearances >= Math.min(4, metrics.length)) {
          recurring.push(kw);
        }
      }

      const latestSrc = (latest.sourceDistribution || {}) as Record<string, number>;
      const prevSrcAgg: Record<string, number[]> = {};
      for (const m of previous) {
        const src = (m.sourceDistribution || {}) as Record<string, number>;
        for (const [k, v] of Object.entries(src)) {
          if (!prevSrcAgg[k]) prevSrcAgg[k] = [];
          prevSrcAgg[k].push(v);
        }
      }
      const sourceShift: Record<string, boolean> = {};
      for (const [src, count] of Object.entries(latestSrc)) {
        const prev = prevSrcAgg[src];
        if (prev && prev.length >= 1) {
          const avg = prev.reduce((a, b) => a + b, 0) / prev.length;
          sourceShift[`${src}Increase`] = count > avg * 1.15;
        }
      }

      res.json({
        trendingUp: trendingUp.slice(0, 5),
        recurring: recurring.slice(0, 5),
        sourceShift,
        metrics,
        insufficient: false,
      });
    } catch (error) {
      handleApiError(res, error, "Failed to get report trends");
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
      handleApiError(res, error, "Failed to get sources");
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
      handleApiError(res, error, "Failed to update source");
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
      handleApiError(res, error, "Failed to delete source");
    }
  });

  app.get("/api/permissions", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const scope = (req.query.scope as string) || "global";
      const scopeId = req.query.scopeId ? parseInt(req.query.scopeId as string, 10) : null;
      const perms = await storage.listPermissions(userId, scope, scopeId);
      res.json(perms);
    } catch (error) {
      handleApiError(res, error, "Failed to list permissions");
    }
  });

  app.get("/api/permissions/effective", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const botId = req.query.botId ? parseInt(req.query.botId as string, 10) : null;
      const { getEffectivePermissions } = await import("./policy/engine");
      const effective = await getEffectivePermissions(userId, botId);
      res.json(effective);
    } catch (error) {
      handleApiError(res, error, "Failed to get effective permissions");
    }
  });

  app.put("/api/permissions", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const { scope, scopeId, permissionKey, value } = req.body;
      if (!scope || !permissionKey || !value) {
        return res.status(400).json({ error: "Missing required fields: scope, permissionKey, value" });
      }
      const perm = await storage.upsertPermission(userId, scope, scopeId ?? null, permissionKey, value);
      const { logPermissionAction } = await import("./policy/engine");
      await logPermissionAction(
        { userId, botId: scopeId ?? null },
        "PERMISSION_CHANGED",
        permissionKey,
        { scope, scopeId, newValue: value },
      );
      res.json(perm);
    } catch (error) {
      handleApiError(res, error, "Failed to update permission");
    }
  });

  app.delete("/api/permissions", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const { scope, scopeId, permissionKey } = req.body;
      if (!scope || !permissionKey) {
        return res.status(400).json({ error: "Missing required fields: scope, permissionKey" });
      }
      await storage.deletePermission(userId, scope, scopeId ?? null, permissionKey);
      const { logPermissionAction } = await import("./policy/engine");
      await logPermissionAction(
        { userId, botId: scopeId ?? null },
        "PERMISSION_DELETED",
        permissionKey,
        { scope, scopeId },
      );
      res.json({ ok: true });
    } catch (error) {
      handleApiError(res, error, "Failed to delete permission");
    }
  });

  app.post("/api/permissions/check", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const { permissionKey, botId } = req.body;
      if (!permissionKey) {
        return res.status(400).json({ error: "Missing permissionKey" });
      }
      const { checkPermission } = await import("./policy/engine");
      const result = await checkPermission({ userId, botId: botId ?? null }, permissionKey);
      res.json(result);
    } catch (error) {
      handleApiError(res, error, "Failed to check permission");
    }
  });

  app.post("/api/permissions/approve-once", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const { permissionKey, action, botId } = req.body;
      if (!permissionKey || !action) {
        return res.status(400).json({ error: "Missing permissionKey or action" });
      }
      grantOneTimeApproval(userId!, permissionKey);
      const { logPermissionAction } = await import("./policy/engine");
      await logPermissionAction(
        { userId, botId: botId ?? null },
        "APPROVAL_GRANTED_ONCE",
        permissionKey,
        { action, scope: "once" },
      );
      res.json({ approved: true, scope: "once", permissionKey, action });
    } catch (error) {
      handleApiError(res, error, "Failed to approve permission");
    }
  });

  app.get("/api/audit-logs", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const filters: any = {};
      if (req.query.botId) filters.botId = parseInt(req.query.botId as string, 10);
      if (req.query.eventType) filters.eventType = req.query.eventType as string;
      if (req.query.permissionKey) filters.permissionKey = req.query.permissionKey as string;
      if (req.query.limit) filters.limit = parseInt(req.query.limit as string, 10);
      if (req.query.days) {
        const days = parseInt(req.query.days as string, 10);
        if (days > 0) filters.since = new Date(Date.now() - days * 86400000);
      }
      if (req.query.since) {
        const since = new Date(req.query.since as string);
        if (!isNaN(since.getTime())) filters.since = since;
      }
      const logs = await storage.listAuditLogs(userId, filters);
      res.json(logs);
    } catch (error) {
      handleApiError(res, error, "Failed to list audit logs");
    }
  });

  app.get("/api/audit-logs/timeline", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const days = parseInt(req.query.days as string, 10) || 7;
      const since = new Date(Date.now() - days * 86400000);
      const logs = await storage.listAuditLogs(userId, { since, limit: 1000 });

      const dailyMap: Record<string, { date: string; denied: number; approved: number; changed: number; requested: number; total: number }> = {};
      for (let i = 0; i < days; i++) {
        const d = new Date(Date.now() - i * 86400000);
        const key = d.toISOString().slice(0, 10);
        dailyMap[key] = { date: key, denied: 0, approved: 0, changed: 0, requested: 0, total: 0 };
      }

      for (const log of logs) {
        const key = new Date(log.createdAt).toISOString().slice(0, 10);
        if (!dailyMap[key]) continue;
        dailyMap[key].total++;
        if (log.eventType === "PERMISSION_DENIED") dailyMap[key].denied++;
        else if (log.eventType.startsWith("APPROVAL_GRANTED")) dailyMap[key].approved++;
        else if (log.eventType === "PERMISSION_CHANGED" || log.eventType === "PERMISSION_DELETED") dailyMap[key].changed++;
        else if (log.eventType === "APPROVAL_REQUESTED") dailyMap[key].requested++;
      }

      const timeline = Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date));
      res.json({ days, timeline, totalEvents: logs.length });
    } catch (error) {
      handleApiError(res, error, "Failed to build audit timeline");
    }
  });

  app.get("/api/permissions/risk-scores", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const bots = await storage.listBots(userId);
      const last7days = new Date(Date.now() - 7 * 86400000);
      const allLogs = await storage.listAuditLogs(userId, { since: last7days, limit: 5000 });
      const { getEffectivePermissions: getEffPerms } = await import("./policy/engine");

      const HIGH_RISK_KEYS = ["FS_DELETE", "LLM_EGRESS_LEVEL", "FS_WRITE"];
      const MED_RISK_KEYS = ["WEB_FETCH", "LLM_USE", "FS_READ", "CAL_WRITE"];

      const botScores = await Promise.all(bots.map(async (bot) => {
        const effective = await getEffPerms(userId, bot.id);
        const botLogs = allLogs.filter((l: any) => l.botId === bot.id);
        const denials = botLogs.filter((l: any) => l.eventType === "PERMISSION_DENIED").length;

        let score = 0;
        for (const [key, perm] of Object.entries(effective)) {
          const p = perm as any;
          if (!p.enabled) continue;
          if (HIGH_RISK_KEYS.includes(key)) {
            score += p.approvalMode === "AUTO_ALLOWED" ? 30 : p.approvalMode === "APPROVAL_REQUIRED" ? 15 : 0;
          } else if (MED_RISK_KEYS.includes(key)) {
            score += p.approvalMode === "AUTO_ALLOWED" ? 15 : p.approvalMode === "APPROVAL_REQUIRED" ? 5 : 0;
          } else {
            score += p.approvalMode === "AUTO_ALLOWED" ? 5 : 0;
          }
          if (key === "LLM_EGRESS_LEVEL" && p.egressLevel === "FULL_CONTENT_ALLOWED") score += 20;
        }
        score += denials * 5;
        score = Math.min(score, 100);

        let level: string;
        if (score <= 25) level = "low";
        else if (score <= 50) level = "moderate";
        else if (score <= 75) level = "elevated";
        else level = "high";

        return {
          botId: bot.id,
          botName: bot.name,
          score,
          level,
          denials7d: denials,
          totalEvents7d: botLogs.length,
        };
      }));

      res.json(botScores);
    } catch (error) {
      handleApiError(res, error, "Failed to compute risk scores");
    }
  });

  // ============================================
  // RULE MEMORIES - Long-term memory for user preferences
  // ============================================

  app.get("/api/memory/rules", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req)!;
      const scope = (req.query.scope as string) || "global";
      const scopeId = req.query.scopeId ? parseInt(req.query.scopeId as string) : null;

      if (scope === "all") {
        const rules = await storage.listAllUserRuleMemories(userId);
        res.json(rules);
      } else {
        const rules = await storage.listRuleMemories(userId, scope, scopeId);
        res.json(rules);
      }
    } catch (error) {
      handleApiError(res, error, "Failed to list rule memories");
    }
  });

  app.get("/api/memory/rules/effective", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req)!;
      const botId = req.query.botId ? parseInt(req.query.botId as string) : null;
      const effective = await storage.getEffectiveRules(userId, botId);
      res.json(effective);
    } catch (error) {
      handleApiError(res, error, "Failed to get effective rules");
    }
  });

  app.put("/api/memory/rules", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req)!;
      const { scope, scopeId, key, value } = req.body;

      if (!scope || !key || value === undefined) {
        res.status(400).json({ error: "scope, key, and value are required" });
        return;
      }

      const allowed = await enforcePermission(req, res, "MEMORY_WRITE", "upsert_rule", scopeId);
      if (!allowed) return;

      const rule = await storage.upsertRuleMemory(userId, scope, scopeId ?? null, key, value);

      await storage.createAuditLog({
        userId,
        botId: scope === "bot" ? scopeId : null,
        eventType: "MEMORY_RULE_UPSERT",
        permissionKey: "MEMORY_WRITE",
        payloadJson: { key, scope, scopeId },
      });

      res.json(rule);
    } catch (error) {
      handleApiError(res, error, "Failed to save rule memory");
    }
  });

  app.delete("/api/memory/rules", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req)!;
      const { scope, scopeId, key } = req.body;

      if (!scope || !key) {
        res.status(400).json({ error: "scope and key are required" });
        return;
      }

      const allowed = await enforcePermission(req, res, "MEMORY_WRITE", "delete_rule", scopeId);
      if (!allowed) return;

      await storage.deleteRuleMemory(userId, scope, scopeId ?? null, key);

      await storage.createAuditLog({
        userId,
        botId: scope === "bot" ? scopeId : null,
        eventType: "MEMORY_RULE_DELETE",
        permissionKey: "MEMORY_WRITE",
        payloadJson: { key, scope, scopeId },
      });

      res.json({ ok: true });
    } catch (error) {
      handleApiError(res, error, "Failed to delete rule memory");
    }
  });

  // ============================================
  // TELEGRAM LINK MANAGEMENT
  // ============================================
  app.post("/api/telegram/link-code", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "Not authenticated" });
      const code = await storage.createLinkCode(userId, "telegram");
      res.json({ code, expiresInSeconds: 600 });
    } catch (error) {
      handleApiError(res, error, "Failed to generate link code");
    }
  });

  app.get("/api/telegram/status", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "Not authenticated" });
      const link = await storage.getTelegramLinkByUserId(userId);
      const dbToken = await storage.getAppSetting("TELEGRAM_BOT_TOKEN");
      const hasToken = !!(process.env.TELEGRAM_BOT_TOKEN || dbToken);
      res.json({
        linked: !!link,
        telegramUsername: link?.telegramUsername || null,
        linkedAt: link?.createdAt || null,
        botConfigured: hasToken,
        tokenSource: dbToken ? "settings" : (process.env.TELEGRAM_BOT_TOKEN ? "env" : null),
      });
    } catch (error) {
      handleApiError(res, error, "Failed to get Telegram status");
    }
  });

  app.put("/api/telegram/bot-token", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "Not authenticated" });
      const { token } = req.body;
      if (!token || typeof token !== "string" || token.trim().length < 10) {
        return res.status(400).json({ error: "Invalid bot token" });
      }
      await storage.setAppSetting("TELEGRAM_BOT_TOKEN", token.trim());
      process.env.TELEGRAM_BOT_TOKEN = token.trim();
      if (isLocalMode) {
        stopPolling();
        startPolling().catch(err => console.error("[Telegram] polling restart error:", err));
      } else {
        setupTelegramWebhook().catch(err => console.error("[Telegram] webhook setup error after token save:", err));
      }
      res.json({ ok: true });
    } catch (error) {
      handleApiError(res, error, "Failed to save bot token");
    }
  });

  app.delete("/api/telegram/bot-token", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "Not authenticated" });
      await storage.deleteAppSetting("TELEGRAM_BOT_TOKEN");
      delete process.env.TELEGRAM_BOT_TOKEN;
      if (isLocalMode) {
        stopPolling();
      }
      res.json({ ok: true });
    } catch (error) {
      handleApiError(res, error, "Failed to delete bot token");
    }
  });

  app.delete("/api/telegram/unlink", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "Not authenticated" });
      await storage.deleteTelegramLink(userId);
      res.json({ ok: true });
    } catch (error) {
      handleApiError(res, error, "Failed to unlink Telegram");
    }
  });

  if (isLocalMode) {
    (async () => {
      try {
        const dbToken = await storage.getAppSetting("TELEGRAM_BOT_TOKEN");
        if (dbToken && !process.env.TELEGRAM_BOT_TOKEN) {
          process.env.TELEGRAM_BOT_TOKEN = dbToken;
          console.log("[Telegram] Loaded bot token from app settings (local mode)");
        }
      } catch (e) {}
      startPolling().catch(err => console.error("[Telegram] polling start error:", err));
    })();
  } else {
    registerTelegramWebhook(app);
    (async () => {
      try {
        const dbToken = await storage.getAppSetting("TELEGRAM_BOT_TOKEN");
        if (dbToken && !process.env.TELEGRAM_BOT_TOKEN) {
          process.env.TELEGRAM_BOT_TOKEN = dbToken;
          console.log("[Telegram] Loaded bot token from app settings");
        }
      } catch (e) {}
      setupTelegramWebhook().catch(err => console.error("[Telegram] webhook setup error:", err));
    })();
  }

  app.use((err: Error, _req: Request, res: Response, next: NextFunction) => {
    if (err instanceof NotImplementedError || err?.name === "NotImplementedError") {
      console.warn(`[Route] ${err.message}`);
      res.status(501).json({
        error: err.message,
        code: "NOT_IMPLEMENTED_SQLITE",
        hint: "이 기능은 로컬 MVP에서 아직 비활성입니다. Fast Report와 Console은 정상 작동합니다.",
      });
      return;
    }
    next(err);
  });

  return httpServer;
}
