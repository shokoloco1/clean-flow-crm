import { useLanguage } from "@/hooks/useLanguage";
import { Button } from "@/components/ui/button";
import { Globe } from "lucide-react";

export function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();

  const toggleLanguage = () => {
    setLanguage(language === "en" ? "es" : "en");
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleLanguage}
      className="relative h-12 w-12"
      title={language === "en" ? "Cambiar a Español" : "Switch to English"}
    >
      <Globe className="h-5 w-5" />
      <span className="absolute -bottom-0.5 -right-0.5 rounded bg-primary px-1 text-[10px] font-bold text-primary-foreground">
        {language === "en" ? "ES" : "EN"}
      </span>
    </Button>
  );
}
