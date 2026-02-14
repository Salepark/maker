import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { ShieldAlert, AlertTriangle, Info, Zap } from "lucide-react";
import { useLanguage } from "@/lib/language-provider";
import type { PermissionRequest } from "@/hooks/use-permission-request";

interface PermissionRequestModalProps {
  request: PermissionRequest | null;
}

export function PermissionRequestModal({ request }: PermissionRequestModalProps) {
  const { t, language } = useLanguage();
  const [scope, setScope] = useState<"once" | "bot" | "global">("once");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!request) return null;

  const msg = request.message;
  const title = msg ? (language === "ko" ? msg.titleKo : msg.titleEn) : request.permissionKey;
  const why = msg ? (language === "ko" ? msg.whyKo : msg.whyEn) : "";
  const impact = msg ? (language === "ko" ? msg.impactKo : msg.impactEn) : "";
  const risk = msg ? (language === "ko" ? msg.riskKo : msg.riskEn) : "";

  const hasBotContext = request.botId != null;

  async function handleApprove() {
    setIsSubmitting(true);
    try {
      await request.onApprove(scope);
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleDeny() {
    request.onDeny();
  }

  return (
    <Dialog open={true} onOpenChange={(open) => { if (!open) handleDeny(); }}>
      <DialogContent className="sm:max-w-md" data-testid="modal-permission-request">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-amber-500 dark:text-amber-400 shrink-0" />
            <DialogTitle className="text-base" data-testid="text-approval-title">
              {title}
            </DialogTitle>
          </div>
          <p className="text-sm text-muted-foreground mt-1" data-testid="text-approval-subtitle">
            {t("approval.title")}
          </p>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {why && (
            <div className="flex gap-2 text-sm" data-testid="section-why">
              <Info className="h-4 w-4 text-blue-500 dark:text-blue-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-medium text-muted-foreground">{t("approval.why")}</span>
                <p className="mt-0.5">{why}</p>
              </div>
            </div>
          )}

          {impact && (
            <div className="flex gap-2 text-sm" data-testid="section-impact">
              <Zap className="h-4 w-4 text-green-500 dark:text-green-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-medium text-muted-foreground">{t("approval.impact")}</span>
                <p className="mt-0.5">{impact}</p>
              </div>
            </div>
          )}

          {risk && (
            <div className="flex gap-2 text-sm" data-testid="section-risk">
              <AlertTriangle className="h-4 w-4 text-amber-500 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-medium text-muted-foreground">{t("approval.risk")}</span>
                <p className="mt-0.5">{risk}</p>
              </div>
            </div>
          )}

          <div className="pt-2 border-t" data-testid="section-scope">
            <p className="text-sm font-medium text-muted-foreground mb-2">{t("approval.scope")}</p>
            <RadioGroup
              value={scope}
              onValueChange={(v) => setScope(v as "once" | "bot" | "global")}
              className="space-y-2"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="once" id="scope-once" data-testid="radio-scope-once" />
                <Label htmlFor="scope-once" className="text-sm cursor-pointer">
                  {t("approval.scopeOnce")}
                </Label>
              </div>
              {hasBotContext && (
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="bot" id="scope-bot" data-testid="radio-scope-bot" />
                  <Label htmlFor="scope-bot" className="text-sm cursor-pointer">
                    {t("approval.scopeBot")}
                  </Label>
                </div>
              )}
              <div className="flex items-center gap-2">
                <RadioGroupItem value="global" id="scope-global" data-testid="radio-scope-global" />
                <Label htmlFor="scope-global" className="text-sm cursor-pointer">
                  {t("approval.scopeGlobal")}
                </Label>
              </div>
            </RadioGroup>
          </div>

          <p className="text-xs text-muted-foreground pt-1" data-testid="text-control-note">
            {t("approval.youAreInControl")}
          </p>
        </div>

        <DialogFooter className="flex flex-row gap-2 justify-end">
          <Button
            variant="outline"
            onClick={handleDeny}
            disabled={isSubmitting}
            data-testid="button-approval-deny"
          >
            {t("approval.deny")}
          </Button>
          <Button
            onClick={handleApprove}
            disabled={isSubmitting}
            data-testid="button-approval-approve"
          >
            {isSubmitting ? t("approval.approve") + "..." : t("approval.approve")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
