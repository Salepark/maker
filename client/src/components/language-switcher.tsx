import { useLanguage } from "@/lib/language-provider";
import { Button } from "@/components/ui/button";
import { Globe } from "lucide-react";

export function LanguageSwitcher() {
  const { language, setLanguage, t } = useLanguage();

  const toggle = () => {
    setLanguage(language === "en" ? "ko" : "en");
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggle}
      data-testid="button-language-toggle"
      className="gap-1.5"
    >
      <Globe className="h-4 w-4" />
      <span className="text-xs font-medium">{language === "en" ? t("lang.en") : t("lang.ko")}</span>
    </Button>
  );
}
