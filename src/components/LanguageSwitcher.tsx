import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Globe } from "lucide-react";
import { setLanguage, getLanguage, type Language } from "@/lib/i18n";

export function LanguageSwitcher() {
  const [lang, setLang] = useState<Language>(getLanguage());
  
  useEffect(() => {
    setLang(getLanguage());
  }, []);
  
  const handleChange = (newLang: Language) => {
    setLanguage(newLang);
    setLang(newLang);
    // Force re-render by reloading the page
    window.location.reload();
  };
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9">
          <Globe className="h-4 w-4" />
          <span className="sr-only">Switch language</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem 
          onClick={() => handleChange("en")}
          className={lang === "en" ? "bg-accent" : ""}
        >
          <span className="mr-2">🇦🇺</span>
          English
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => handleChange("es")}
          className={lang === "es" ? "bg-accent" : ""}
        >
          <span className="mr-2">🇪🇸</span>
          Español
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
