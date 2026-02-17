import { parseCommand } from "./command-parser";
import { routeCommand, execPipelineRun } from "./commandRouter";
import { storage } from "../storage";

export interface ChatEngineRequest {
  userId: string;
  threadId: number;
  text: string;
}

export interface ChatEngineResponse {
  ok: boolean;
  mode: "clarification" | "confirm" | "executed";
  message: string;
  pendingMessageId?: number;
  confirmText?: string;
  command?: any;
  result?: any;
}

export async function processMessage(req: ChatEngineRequest): Promise<ChatEngineResponse> {
  const { userId, threadId, text } = req;

  await storage.addThreadMessage({
    threadId,
    userId,
    role: "user",
    contentText: text,
    kind: "text",
  });

  const userBots = await storage.listBots(userId);
  const thread = await storage.getThread(threadId, userId);
  let activeBotKey: string | null = null;
  if (thread?.activeBotId) {
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
    return {
      ok: true,
      mode: "clarification",
      message: clarificationText || "Could you be more specific?",
    };
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
    return {
      ok: true,
      mode: "confirm",
      message: command.confirmText || `Run '${command.type}'?`,
      pendingMessageId: confirmMsg.id,
      confirmText: command.confirmText,
      command,
    };
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

  return {
    ok: result.ok,
    mode: "executed",
    message: result.assistantMessage,
    result: result.result,
  };
}

export async function processConfirm(userId: string, threadId: number, pendingMessageId: number, approve: boolean): Promise<ChatEngineResponse> {
  const messages = await storage.listThreadMessages(threadId, userId, 200);
  const pendingMsg = messages.find(m => m.id === pendingMessageId && m.status === "pending_confirm");

  if (!pendingMsg) {
    return { ok: false, mode: "executed", message: "Pending confirmation not found or already resolved." };
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
    return { ok: true, mode: "executed", message: "Cancelled." };
  }

  const command = pendingMsg.commandJson as any;

  if (command.type === "pipeline_run") {
    const stepMessages: string[] = [];
    const result = await execPipelineRun(userId, command, async (step) => {
      await storage.addThreadMessage({
        threadId,
        userId,
        role: "assistant",
        contentText: step.message,
        kind: "pipeline_step",
        resultJson: step,
      });
      stepMessages.push(step.message);
    });
    return {
      ok: result.ok,
      mode: "executed",
      message: stepMessages.length > 0 ? stepMessages.join("\n") : result.assistantMessage,
      result: result.result,
    };
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

  return {
    ok: result.ok,
    mode: "executed",
    message: result.assistantMessage,
    result: result.result,
  };
}
