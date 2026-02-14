import { createContext, useContext, useCallback, useState } from "react";
import type { PermissionRequestMessage } from "@shared/permission-messages";
import { PermissionRequestModal } from "@/components/permission-request-modal";
import type { PermissionRequest } from "@/hooks/use-permission-request";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/lib/language-provider";
import { queryClient } from "@/lib/queryClient";

interface ApprovalRequiredData {
  requiresApproval: true;
  permissionKey: string;
  action: string;
  botId?: number | null;
  message: PermissionRequestMessage | null;
}

interface PermissionRequestContextType {
  requestApproval: (
    data: ApprovalRequiredData,
    retryFn: () => Promise<void>,
  ) => void;
  interceptResponse: (
    res: Response,
    retryFn: () => Promise<void>,
  ) => Promise<boolean>;
}

const PermissionRequestContext = createContext<PermissionRequestContextType | undefined>(undefined);

export function PermissionRequestProvider({ children }: { children: React.ReactNode }) {
  const [request, setRequest] = useState<PermissionRequest | null>(null);
  const { toast } = useToast();
  const { t } = useLanguage();

  const requestApproval = useCallback(
    (data: ApprovalRequiredData, retryFn: () => Promise<void>) => {
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
            toast({ title: t("approval.approved") });
            queryClient.invalidateQueries({ queryKey: ["/api/permissions"] });
            queryClient.invalidateQueries({ queryKey: ["/api/audit-logs"] });
            await retryFn();
          } catch {
            toast({ title: "Error", variant: "destructive" });
          }
        },
        onDeny: () => {
          setRequest(null);
          toast({ title: t("approval.denied") });
        },
      });
    },
    [toast, t],
  );

  const interceptResponse = useCallback(
    async (res: Response, retryFn: () => Promise<void>): Promise<boolean> => {
      if (res.status === 403) {
        const cloned = res.clone();
        try {
          const body = await cloned.json();
          if (body.requiresApproval) {
            requestApproval(body as ApprovalRequiredData, retryFn);
            return true;
          }
        } catch {}
      }
      return false;
    },
    [requestApproval],
  );

  return (
    <PermissionRequestContext.Provider value={{ requestApproval, interceptResponse }}>
      {children}
      <PermissionRequestModal request={request} />
    </PermissionRequestContext.Provider>
  );
}

export function usePermissionApproval() {
  const ctx = useContext(PermissionRequestContext);
  if (!ctx) throw new Error("usePermissionApproval must be used within PermissionRequestProvider");
  return ctx;
}
