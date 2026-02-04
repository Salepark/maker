import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { collectFromSource, collectAllSources } from "./services/rss";
import { startScheduler, stopScheduler, getSchedulerStatus, runCollectNow, runAnalyzeNow, runDraftNow, runDailyBriefNow } from "./jobs/scheduler";
import { parseCommand } from "./chat/command-parser";
import { executeCommand } from "./chat/executor";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  app.get("/api/stats", async (req, res) => {
    try {
      const stats = await storage.getStats();
      res.json(stats);
    } catch (error) {
      console.error("Error getting stats:", error);
      res.status(500).json({ error: "Failed to get stats" });
    }
  });

  app.get("/api/items/recent", async (req, res) => {
    try {
      const items = await storage.getRecentItems(10);
      res.json(items);
    } catch (error) {
      console.error("Error getting recent items:", error);
      res.status(500).json({ error: "Failed to get recent items" });
    }
  });

  app.get("/api/items/observe", async (req, res) => {
    try {
      const items = await storage.getObserveItems(50);
      res.json(items);
    } catch (error) {
      console.error("Error getting observe items:", error);
      res.status(500).json({ error: "Failed to get observe items" });
    }
  });

  app.get("/api/items", async (req, res) => {
    try {
      const status = req.query.status as string | undefined;
      const items = await storage.getItems(status);
      res.json(items);
    } catch (error) {
      console.error("Error getting items:", error);
      res.status(500).json({ error: "Failed to get items" });
    }
  });

  app.get("/api/items/:id", async (req, res) => {
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

  app.post("/api/items/:id/skip", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.updateItemStatus(id, "skipped");
      res.json({ success: true });
    } catch (error) {
      console.error("Error skipping item:", error);
      res.status(500).json({ error: "Failed to skip item" });
    }
  });

  app.post("/api/items/:id/reanalyze", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.updateItemStatus(id, "new");
      res.json({ success: true });
    } catch (error) {
      console.error("Error setting item for reanalysis:", error);
      res.status(500).json({ error: "Failed to set for reanalysis" });
    }
  });

  app.get("/api/sources", async (req, res) => {
    try {
      const sources = await storage.getSources();
      res.json(sources);
    } catch (error) {
      console.error("Error getting sources:", error);
      res.status(500).json({ error: "Failed to get sources" });
    }
  });

  app.post("/api/sources", async (req, res) => {
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

  app.patch("/api/sources/:id", async (req, res) => {
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

  app.delete("/api/sources/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteSource(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting source:", error);
      res.status(500).json({ error: "Failed to delete source" });
    }
  });

  app.post("/api/sources/:id/collect", async (req, res) => {
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

  app.get("/api/drafts", async (req, res) => {
    try {
      const decision = req.query.decision as string | undefined;
      const drafts = await storage.getDrafts(decision);
      res.json(drafts);
    } catch (error) {
      console.error("Error getting drafts:", error);
      res.status(500).json({ error: "Failed to get drafts" });
    }
  });

  app.post("/api/drafts/:id/approve", async (req, res) => {
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

  app.post("/api/drafts/:id/reject", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.updateDraftDecision(id, "rejected");
      res.json({ success: true });
    } catch (error) {
      console.error("Error rejecting draft:", error);
      res.status(500).json({ error: "Failed to reject draft" });
    }
  });

  app.get("/api/scheduler/status", async (req, res) => {
    try {
      const status = getSchedulerStatus();
      res.json(status);
    } catch (error) {
      console.error("Error getting scheduler status:", error);
      res.status(500).json({ error: "Failed to get scheduler status" });
    }
  });

  app.post("/api/scheduler/start", async (req, res) => {
    try {
      startScheduler();
      res.json({ success: true, isRunning: true });
    } catch (error) {
      console.error("Error starting scheduler:", error);
      res.status(500).json({ error: "Failed to start scheduler" });
    }
  });

  app.post("/api/scheduler/stop", async (req, res) => {
    try {
      stopScheduler();
      res.json({ success: true, isRunning: false });
    } catch (error) {
      console.error("Error stopping scheduler:", error);
      res.status(500).json({ error: "Failed to stop scheduler" });
    }
  });

  app.post("/api/scheduler/run/collect", async (req, res) => {
    try {
      const result = await runCollectNow();
      res.json(result);
    } catch (error) {
      console.error("Error running collect:", error);
      res.status(500).json({ error: "Failed to run collect" });
    }
  });

  app.post("/api/scheduler/run/analyze", async (req, res) => {
    try {
      const count = await runAnalyzeNow();
      res.json({ analyzed: count });
    } catch (error) {
      console.error("Error running analyze:", error);
      res.status(500).json({ error: "Failed to run analyze" });
    }
  });

  app.post("/api/scheduler/run/draft", async (req, res) => {
    try {
      const count = await runDraftNow();
      res.json({ drafted: count });
    } catch (error) {
      console.error("Error running draft:", error);
      res.status(500).json({ error: "Failed to run draft" });
    }
  });

  app.get("/api/reports", async (req, res) => {
    try {
      const reports = await storage.getReports(20);
      res.json(reports);
    } catch (error) {
      console.error("Error getting reports:", error);
      res.status(500).json({ error: "Failed to get reports" });
    }
  });

  app.get("/api/reports/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const report = await storage.getReport(id);
      if (!report) {
        return res.status(404).json({ error: "Report not found" });
      }
      res.json(report);
    } catch (error) {
      console.error("Error getting report:", error);
      res.status(500).json({ error: "Failed to get report" });
    }
  });

  app.post("/api/debug/generate-daily-brief", async (req, res) => {
    try {
      const topic = req.body?.topic || "ai_art";
      const result = await runDailyBriefNow(topic);
      res.json({ ok: true, reportId: result.id, itemsCount: result.itemsCount, topic });
    } catch (error: any) {
      console.error("Error generating daily brief:", error);
      res.status(500).json({ ok: false, error: error?.message ?? String(error) });
    }
  });

  app.get("/api/chat/messages", async (req, res) => {
    try {
      const messages = await storage.getChatMessages(100);
      res.json(messages.reverse());
    } catch (error) {
      console.error("Error getting chat messages:", error);
      res.status(500).json({ error: "Failed to get chat messages" });
    }
  });

  app.post("/api/chat/command", async (req, res) => {
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

  return httpServer;
}
