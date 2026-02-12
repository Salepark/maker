import { useState, useCallback } from "react";
import type { PermissionRequestMessage } from "@shared/permission-messages";

export interface PermissionRequest {
  permissionKey: string;
  action: string;
  botId?: number | null;
  message: PermissionRequestMessage | null;
  onApprove: (scope: "once" | "bot" | "global") => void;
  onDeny: () => void;
}

export function usePermissionRequest() {
  const [request, setRequest] = useState<PermissionRequest | null>(null);

  const handleApprovalRequired = useCallback(
    (
      data: {
        permissionKey: string;
        action: string;
        botId?: number | null;
        message: PermissionRequestMessage | null;
      },
      retryFn: () => Promise<void>,
    ) => {
      return new Promise<boolean>((resolve) => {
        setRequest({
          permissionKey: data.permissionKey,
          action: data.action,
          botId: data.botId,
          message: data.message,
          onApprove: async (scope) => {
            setRequest(null);
            try {
              if (scope === "once") {
                await fetch("/api/permissions/approve-once", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  credentials: "include",
                  body: JSON.stringify({
                    permissionKey: data.permissionKey,
                    action: data.action,
                    botId: data.botId,
                  }),
                });
              } else if (scope === "bot" && data.botId) {
                await fetch("/api/permissions", {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  credentials: "include",
                  body: JSON.stringify({
                    scope: "bot",
                    scopeId: data.botId,
                    permissionKey: data.permissionKey,
                    value: { enabled: true, approvalMode: "AUTO_ALLOWED" },
                  }),
                });
              } else {
                await fetch("/api/permissions", {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  credentials: "include",
                  body: JSON.stringify({
                    scope: "global",
                    scopeId: null,
                    permissionKey: data.permissionKey,
                    value: { enabled: true, approvalMode: "AUTO_ALLOWED" },
                  }),
                });
              }
              await retryFn();
              resolve(true);
            } catch {
              resolve(false);
            }
          },
          onDeny: () => {
            setRequest(null);
            resolve(false);
          },
        });
      });
    },
    [],
  );

  const checkAndRetry = useCallback(
    async (
      apiFn: () => Promise<Response>,
      retryFn: () => Promise<void>,
    ): Promise<Response | null> => {
      const res = await apiFn();
      if (res.status === 403) {
        const body = await res.json();
        if (body.requiresApproval) {
          const approved = await handleApprovalRequired(body, retryFn);
          return approved ? null : null;
        }
      }
      return res;
    },
    [handleApprovalRequired],
  );

  return { request, checkAndRetry, handleApprovalRequired, dismiss: () => setRequest(null) };
}
