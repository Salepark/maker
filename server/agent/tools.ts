import type { PermissionKey, RiskTier } from "../policy/types";

export interface ToolDef {
  toolKey: string;
  permissionKey: PermissionKey;
  platform: "web" | "desktop" | "both";
  riskTier: RiskTier;
  labelEn: string;
  labelKo: string;
}

export const TOOL_REGISTRY: ToolDef[] = [
  {
    toolKey: "web.fetch",
    permissionKey: "WEB_FETCH",
    platform: "both",
    riskTier: "MEDIUM",
    labelEn: "Fetch web page",
    labelKo: "웹 페이지 가져오기",
  },
  {
    toolKey: "web.rss",
    permissionKey: "WEB_RSS",
    platform: "both",
    riskTier: "LOW",
    labelEn: "Collect RSS feed",
    labelKo: "RSS 피드 수집",
  },
  {
    toolKey: "sources.manage",
    permissionKey: "SOURCE_WRITE",
    platform: "both",
    riskTier: "HIGH",
    labelEn: "Manage sources",
    labelKo: "소스 관리",
  },
  {
    toolKey: "llm.analyze",
    permissionKey: "LLM_USE",
    platform: "both",
    riskTier: "MEDIUM",
    labelEn: "AI analysis",
    labelKo: "AI 분석",
  },
  {
    toolKey: "schedule.set",
    permissionKey: "SCHEDULE_WRITE",
    platform: "both",
    riskTier: "HIGH",
    labelEn: "Set schedule",
    labelKo: "스케줄 설정",
  },
  {
    toolKey: "files.read",
    permissionKey: "FS_READ",
    platform: "desktop",
    riskTier: "HIGH",
    labelEn: "Read file",
    labelKo: "파일 읽기",
  },
  {
    toolKey: "files.write",
    permissionKey: "FS_WRITE",
    platform: "desktop",
    riskTier: "CRITICAL",
    labelEn: "Write file",
    labelKo: "파일 쓰기",
  },
  {
    toolKey: "telegram.send",
    permissionKey: "TELEGRAM_SEND",
    platform: "both",
    riskTier: "MEDIUM",
    labelEn: "Send Telegram message",
    labelKo: "텔레그램 메시지 전송",
  },
];

export function getToolDef(toolKey: string): ToolDef | undefined {
  return TOOL_REGISTRY.find(t => t.toolKey === toolKey);
}

export function getToolsByPermission(permissionKey: PermissionKey): ToolDef[] {
  return TOOL_REGISTRY.filter(t => t.permissionKey === permissionKey);
}
