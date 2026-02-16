import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import { staffTranslations, TranslationKey } from "@/lib/translations/staff";
import { adminTranslations, AdminTranslationKey } from "@/lib/translations/admin";

type Language = "en" | "es";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey) => string;
  tAdmin: (key: AdminTranslationKey) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const STORAGE_KEY = "pulcrix_language";

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    // Initialize from localStorage
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "es" || stored === "en") {
        return stored;
      }
    }
    return "en";
  });

  // Persist language changes
  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem(STORAGE_KEY, lang);
  }, []);

  // Sync with localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "es" || stored === "en") {
      setLanguageState(stored);
    }
  }, []);

  // Translation function for staff
  const t = useCallback(
    (key: TranslationKey): string => {
      const translations = staffTranslations[language];
      return translations[key] || staffTranslations.en[key] || key;
    },
    [language],
  );

  // Translation function for admin
  const tAdmin = useCallback(
    (key: AdminTranslationKey): string => {
      const translations = adminTranslations[language];
      return translations[key] || adminTranslations.en[key] || key;
    },
    [language],
  );

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, tAdmin }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
