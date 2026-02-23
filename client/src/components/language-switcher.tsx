import { useLanguage } from "@/lib/language-provider";
import { Button } from "@/components/ui/button";
import { Globe } from "lucide-react";

export function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();

  const toggle = () => {
    setLanguage(language === "ko" ? "en" : "ko");
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={toggle}
      data-testid="button-language-switch"
    >
      <Globe className="h-4 w-4 mr-1" />
      {language === "ko" ? "EN" : "한국어"}
    </Button>
  );
}
