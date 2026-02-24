import { storage } from "../storage";
import type { Permission } from "@shared/schema";
import {
  type PermissionKey,
  type PermissionValue,
  type ApprovalMode,
  type EgressLevel,
  type PolicyContext,
  type PermissionCheckResult,
  type EgressCheckResult,
  getDefaultPermissionValue,
  getDefaultEgressLevel,
} from "./types";

export async function getEffectivePermissions(
  userId: string,
  botId?: number | null,
): Promise<Record<string, PermissionValue & { egressLevel?: EgressLevel; source: "default" | "global" | "bot" }>> {
  const globalPerms = await storage.listPermissions(userId, "global", null);
  const botPerms = botId ? await storage.listPermissions(userId, "bot", botId) : [];

  const result: Record<string, PermissionValue & { egressLevel?: EgressLevel; source: "default" | "global" | "bot" }> = {};

  const allKeys: PermissionKey[] = [
    "WEB_RSS", "WEB_FETCH", "SOURCE_WRITE",
    "LLM_USE", "LLM_EGRESS_LEVEL",
    "FS_READ", "FS_WRITE", "FS_DELETE",
    "CAL_READ", "CAL_WRITE", "SCHEDULE_WRITE",
    "MEMORY_WRITE", "DATA_RETENTION",
    "AUTONOMY_LEVEL", "AGENT_RUN", "TOOL_USE",
    "TELEGRAM_CONNECT", "TELEGRAM_SEND",
  ];

  for (const key of allKeys) {
    const defaultVal = getDefaultPermissionValue(key);
    const defaultEgress = key === "LLM_EGRESS_LEVEL" ? getDefaultEgressLevel(key) : undefined;

    let effective: PermissionValue & { egressLevel?: EgressLevel; source: "default" | "global" | "bot" } = {
      ...defaultVal,
      egressLevel: defaultEgress,
      source: "default",
    };

    const globalPerm = globalPerms.find(p => p.permissionKey === key);
    if (globalPerm) {
      const val = globalPerm.valueJson as any;
      effective = {
        enabled: val.enabled ?? defaultVal.enabled,
        approvalMode: val.approvalMode ?? defaultVal.approvalMode,
        resourceScope: val.resourceScope,
        egressLevel: val.egressLevel ?? defaultEgress,
        source: "global",
      };
    }

    const botPerm = botPerms.find(p => p.permissionKey === key);
    if (botPerm) {
      const val = botPerm.valueJson as any;
      effective = {
        enabled: val.enabled ?? effective.enabled,
        approvalMode: val.approvalMode ?? effective.approvalMode,
        resourceScope: val.resourceScope ?? effective.resourceScope,
        egressLevel: val.egressLevel ?? effective.egressLevel,
        source: "bot",
      };
    }

    result[key] = effective;
  }

  return result;
}

export async function checkPermission(
  ctx: PolicyContext,
  permissionKey: PermissionKey,
): Promise<PermissionCheckResult> {
  const perms = await getEffectivePermissions(ctx.userId, ctx.botId);
  const policy = perms[permissionKey];

  if (!policy) {
    return {
      allowed: false,
      requiresApproval: false,
      reason: `Unknown permission: ${permissionKey}`,
      effectivePolicy: null,
    };
  }

  if (!policy.enabled) {
    return {
      allowed: false,
      requiresApproval: false,
      reason: `Permission '${permissionKey}' is disabled`,
      effectivePolicy: policy,
    };
  }

  if (policy.approvalMode === "AUTO_DENIED") {
    return {
      allowed: false,
      requiresApproval: false,
      reason: `Permission '${permissionKey}' is denied by policy`,
      effectivePolicy: policy,
    };
  }

  if (policy.approvalMode === "APPROVAL_REQUIRED") {
    return {
      allowed: false,
      requiresApproval: true,
      reason: `Permission '${permissionKey}' requires approval`,
      effectivePolicy: policy,
    };
  }

  return {
    allowed: true,
    requiresApproval: false,
    reason: "Allowed",
    effectivePolicy: policy,
  };
}

export async function checkEgress(
  ctx: PolicyContext,
  requiredLevel: EgressLevel,
): Promise<EgressCheckResult> {
  const perms = await getEffectivePermissions(ctx.userId, ctx.botId);
  const llmUse = perms["LLM_USE"];
  const egressPolicy = perms["LLM_EGRESS_LEVEL"];

  if (!llmUse?.enabled) {
    return {
      allowed: false,
      reason: "LLM usage is disabled",
      effectiveLevel: "NO_EGRESS",
    };
  }

  const effectiveLevel: EgressLevel = egressPolicy?.egressLevel || "NO_EGRESS";

  const levelOrder: Record<EgressLevel, number> = {
    "NO_EGRESS": 0,
    "METADATA_ONLY": 1,
    "FULL_CONTENT_ALLOWED": 2,
  };

  if (levelOrder[requiredLevel] > levelOrder[effectiveLevel]) {
    return {
      allowed: false,
      reason: `Data egress level '${requiredLevel}' exceeds allowed level '${effectiveLevel}'`,
      effectiveLevel,
    };
  }

  return {
    allowed: true,
    reason: "Egress allowed",
    effectiveLevel,
  };
}

export async function logPermissionAction(
  ctx: PolicyContext,
  eventType: string,
  permissionKey: string | null,
  payload: any,
): Promise<void> {
  try {
    await storage.createAuditLog({
      userId: ctx.userId,
      botId: ctx.botId ?? null,
      threadId: ctx.threadId ?? null,
      eventType,
      permissionKey,
      payloadJson: payload,
    });
  } catch (e) {
    console.error("[PolicyEngine] Failed to write audit log:", e);
  }
}
