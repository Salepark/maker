export type ChatCommandType =
  | "list_bots"
  | "switch_bot"
  | "bot_status"
  | "run_now"
  | "pause_bot"
  | "resume_bot"
  | "add_source"
  | "remove_source"
  | "chat";

export type RunNowTarget = "collect" | "analyze" | "draft" | "report";

export type ChatCommand = {
  type: ChatCommandType;
  botKey: string | null;
  args?: Record<string, any>;
  confidence: number;
  needsConfirm: boolean;
  confirmText: string;
};

export type MessageKind = "text" | "pending_command" | "command_result";
