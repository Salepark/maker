import type { Express, Request, Response } from "express";
import { storage } from "../storage";
import { processMessage, processConfirm } from "../chat/chatEngine";

import crypto from "crypto";

const TELEGRAM_API = "https://api.telegram.org/bot";

function getBotToken(): string | null {
  return process.env.TELEGRAM_BOT_TOKEN || null;
}

function getWebhookSecret(): string {
  const token = getBotToken();
  if (!token) return "";
  return crypto.createHash("sha256").update(token).digest("hex").substring(0, 32);
}

async function sendTelegramMessage(chatId: string, text: string, replyMarkup?: any): Promise<void> {
  const token = getBotToken();
  if (!token) return;

  const body: any = {
    chat_id: chatId,
    text: text.substring(0, 4096),
    parse_mode: "Markdown",
  };
  if (replyMarkup) {
    body.reply_markup = JSON.stringify(replyMarkup);
  }

  try {
    const resp = await fetch(`${TELEGRAM_API}${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!resp.ok) {
      const errBody = await resp.text();
      console.error("[Telegram] sendMessage failed:", resp.status, errBody);
      const retryBody = { ...body, parse_mode: undefined };
      await fetch(`${TELEGRAM_API}${token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(retryBody),
      });
    }
  } catch (err) {
    console.error("[Telegram] sendMessage error:", err);
  }
}

async function answerCallbackQuery(callbackQueryId: string, text?: string): Promise<void> {
  const token = getBotToken();
  if (!token) return;

  try {
    await fetch(`${TELEGRAM_API}${token}/answerCallbackQuery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ callback_query_id: callbackQueryId, text }),
    });
  } catch (err) {
    console.error("[Telegram] answerCallbackQuery error:", err);
  }
}

const pendingConfirmations = new Map<string, { userId: string; threadId: number; pendingMessageId: number; expiresAt: number }>();

async function handleLinkCommand(chatId: string, username: string | undefined, code: string): Promise<void> {
  if (!code) {
    await sendTelegramMessage(chatId,
      "Usage: `/link YOUR_CODE`\n\nGenerate a link code from Maker Settings page, then send it here.");
    return;
  }

  const result = await storage.consumeLinkCode(code.trim().toUpperCase());
  if (!result) {
    await sendTelegramMessage(chatId, "Invalid or expired code. Please generate a new one from Maker Settings.");
    return;
  }

  if (result.platform !== "telegram") {
    await sendTelegramMessage(chatId, "This code is not for Telegram linking.");
    return;
  }

  const thread = await storage.createThread(result.userId, "Telegram Chat");

  await storage.createTelegramLink({
    userId: result.userId,
    telegramChatId: chatId,
    telegramUsername: username,
    threadId: thread.id,
  });

  await sendTelegramMessage(chatId,
    "Account linked successfully! You can now control your Maker bots from here.\n\nTry: `봇 목록` or `list bots`");
}

async function handleUnlinkCommand(chatId: string): Promise<void> {
  const link = await storage.getTelegramLinkByChatId(chatId);
  if (!link) {
    await sendTelegramMessage(chatId, "No linked account found.");
    return;
  }
  await storage.deleteTelegramLink(link.userId);
  await sendTelegramMessage(chatId, "Account unlinked. Send `/link CODE` to link again.");
}

async function handleTextMessage(chatId: string, text: string): Promise<void> {
  const link = await storage.getTelegramLinkByChatId(chatId);
  if (!link) {
    await sendTelegramMessage(chatId,
      "Please link your Maker account first.\n\n1. Go to Maker Settings → Telegram\n2. Generate a link code\n3. Send `/link YOUR_CODE` here");
    return;
  }

  try {
    const response = await processMessage({
      userId: link.userId,
      threadId: link.threadId!,
      text,
    });

    if (response.mode === "confirm" && response.pendingMessageId) {
      const key = `${chatId}_${response.pendingMessageId}`;
      pendingConfirmations.set(key, {
        userId: link.userId,
        threadId: link.threadId!,
        pendingMessageId: response.pendingMessageId,
        expiresAt: Date.now() + 5 * 60 * 1000,
      });

      await sendTelegramMessage(chatId, response.message, {
        inline_keyboard: [[
          { text: "Confirm", callback_data: `confirm_${response.pendingMessageId}` },
          { text: "Cancel", callback_data: `cancel_${response.pendingMessageId}` },
        ]],
      });
    } else {
      await sendTelegramMessage(chatId, response.message);
    }
  } catch (err: any) {
    console.error("[Telegram] processMessage error:", err);
    await sendTelegramMessage(chatId, "An error occurred processing your message. Please try again.");
  }
}

async function handleCallbackQuery(chatId: string, callbackQueryId: string, data: string): Promise<void> {
  const link = await storage.getTelegramLinkByChatId(chatId);
  if (!link) {
    await answerCallbackQuery(callbackQueryId, "Not linked");
    return;
  }

  const match = data.match(/^(confirm|cancel)_(\d+)$/);
  if (!match) {
    await answerCallbackQuery(callbackQueryId, "Unknown action");
    return;
  }

  const action = match[1];
  const pendingMessageId = parseInt(match[2], 10);
  const approve = action === "confirm";

  const key = `${chatId}_${pendingMessageId}`;
  const pending = pendingConfirmations.get(key);

  if (!pending || pending.expiresAt < Date.now()) {
    pendingConfirmations.delete(key);
    await answerCallbackQuery(callbackQueryId, "Expired or already handled");
    return;
  }

  pendingConfirmations.delete(key);

  try {
    const response = await processConfirm(link.userId, link.threadId!, pendingMessageId, approve);
    await answerCallbackQuery(callbackQueryId, approve ? "Confirmed" : "Cancelled");
    await sendTelegramMessage(chatId, response.message);
  } catch (err: any) {
    console.error("[Telegram] processConfirm error:", err);
    await answerCallbackQuery(callbackQueryId, "Error processing");
    await sendTelegramMessage(chatId, "An error occurred. Please try again.");
  }
}

async function processUpdate(update: any): Promise<void> {
  if (update.message) {
    const msg = update.message;
    const chatId = String(msg.chat.id);
    const text = msg.text || "";
    const username = msg.from?.username;

    if (text.startsWith("/start")) {
      await sendTelegramMessage(chatId,
        "Welcome to Maker Bot Manager!\n\nLink your account:\n1. Go to Maker Settings → Telegram\n2. Click 'Generate Link Code'\n3. Send `/link YOUR_CODE` here");
    } else if (text.startsWith("/link")) {
      const code = text.replace("/link", "").trim();
      await handleLinkCommand(chatId, username, code);
    } else if (text.startsWith("/unlink")) {
      await handleUnlinkCommand(chatId);
    } else if (text.startsWith("/help")) {
      await sendTelegramMessage(chatId,
        "*Maker Bot Commands*\n\n" +
        "`/link CODE` — Link Maker account\n" +
        "`/unlink` — Unlink account\n" +
        "`/help` — Show this help\n\n" +
        "*Bot commands (after linking):*\n" +
        "• `list bots` / `봇 목록`\n" +
        "• `run now` / `지금 실행`\n" +
        "• `status` / `상태`\n" +
        "• `pause` / `일시정지`\n" +
        "• `resume` / `재개`\n" +
        "• Any natural language command!");
    } else if (text.length > 0) {
      await handleTextMessage(chatId, text);
    }
  }

  if (update.callback_query) {
    const cb = update.callback_query;
    const chatId = String(cb.message?.chat?.id || "");
    if (chatId) {
      await handleCallbackQuery(chatId, cb.id, cb.data || "");
    }
  }
}

// ============================================
// WEBHOOK MODE (Cloud / Web)
// ============================================

export function registerTelegramWebhook(app: Express): void {
  const token = getBotToken();
  if (!token) {
    console.log("[Telegram] No TELEGRAM_BOT_TOKEN set, skipping webhook registration");
    return;
  }

  app.post("/api/telegram/webhook", async (req: Request, res: Response) => {
    try {
      const secret = getWebhookSecret();
      if (secret) {
        const headerToken = req.headers["x-telegram-bot-api-secret-token"];
        if (headerToken !== secret) {
          return res.sendStatus(403);
        }
      }

      await processUpdate(req.body);

      res.sendStatus(200);
    } catch (err) {
      console.error("[Telegram] webhook error:", err);
      res.sendStatus(200);
    }
  });

  console.log("[Telegram] Webhook endpoint registered at /api/telegram/webhook");
}

export async function setupTelegramWebhook(): Promise<void> {
  const token = getBotToken();
  if (!token) return;

  const baseUrl = process.env.APP_BASE_URL || process.env.REPLIT_DEV_DOMAIN;
  if (!baseUrl) {
    console.log("[Telegram] No APP_BASE_URL set, cannot register webhook with Telegram");
    return;
  }

  const url = baseUrl.startsWith("http") ? baseUrl : `https://${baseUrl}`;
  const webhookUrl = `${url}/api/telegram/webhook`;

  try {
    const resp = await fetch(`${TELEGRAM_API}${token}/setWebhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: webhookUrl, secret_token: getWebhookSecret() }),
    });
    const result = await resp.json();
    console.log("[Telegram] Webhook setup result:", result);
  } catch (err) {
    console.error("[Telegram] Failed to set webhook:", err);
  }
}

// ============================================
// POLLING MODE (Desktop / Local)
// ============================================

let pollingActive = false;
let pollingTimeout: ReturnType<typeof setTimeout> | null = null;

async function deleteWebhook(): Promise<void> {
  const token = getBotToken();
  if (!token) return;

  try {
    await fetch(`${TELEGRAM_API}${token}/deleteWebhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ drop_pending_updates: true }),
    });
    console.log("[Telegram] Webhook deleted for polling mode");
  } catch (err) {
    console.error("[Telegram] Failed to delete webhook:", err);
  }
}

async function getUpdates(offset: number): Promise<{ updates: any[]; nextOffset: number }> {
  const token = getBotToken();
  if (!token) return { updates: [], nextOffset: offset };

  try {
    const resp = await fetch(`${TELEGRAM_API}${token}/getUpdates`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        offset,
        timeout: 30,
        allowed_updates: ["message", "callback_query"],
      }),
    });
    const data = await resp.json() as any;

    if (!data.ok || !Array.isArray(data.result)) {
      return { updates: [], nextOffset: offset };
    }

    const updates = data.result;
    const newOffset = updates.length > 0
      ? updates[updates.length - 1].update_id + 1
      : offset;

    return { updates, nextOffset: newOffset };
  } catch (err) {
    console.error("[Telegram] getUpdates error:", err);
    return { updates: [], nextOffset: offset };
  }
}

async function pollLoop(offset: number): Promise<void> {
  if (!pollingActive) return;

  const token = getBotToken();
  if (!token) {
    console.log("[Telegram] Polling paused: no bot token");
    pollingTimeout = setTimeout(() => pollLoop(offset), 10000);
    return;
  }

  try {
    const { updates, nextOffset } = await getUpdates(offset);

    for (const update of updates) {
      try {
        await processUpdate(update);
      } catch (err) {
        console.error("[Telegram] Error processing polled update:", err);
      }
    }

    if (pollingActive) {
      pollingTimeout = setTimeout(() => pollLoop(nextOffset), 500);
    }
  } catch (err) {
    console.error("[Telegram] Polling error:", err);
    if (pollingActive) {
      pollingTimeout = setTimeout(() => pollLoop(offset), 5000);
    }
  }
}

export async function startPolling(): Promise<void> {
  if (pollingActive) return;

  const token = getBotToken();
  if (!token) {
    console.log("[Telegram] No bot token set, polling will start when token is configured");
  }

  await deleteWebhook();
  pollingActive = true;
  console.log("[Telegram] Polling mode started");
  pollLoop(0);
}

export function stopPolling(): void {
  pollingActive = false;
  if (pollingTimeout) {
    clearTimeout(pollingTimeout);
    pollingTimeout = null;
  }
  console.log("[Telegram] Polling stopped");
}

export function isPollingActive(): boolean {
  return pollingActive;
}

// ============================================
// SHARED: Pending confirmation cleanup
// ============================================

setInterval(() => {
  const now = Date.now();
  for (const [key, val] of pendingConfirmations.entries()) {
    if (val.expiresAt < now) {
      pendingConfirmations.delete(key);
    }
  }
}, 60 * 1000);
