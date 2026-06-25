import { createContext, useContext, useState, useCallback, useEffect, useMemo, type ReactNode } from "react";
import { translations, supportedLanguages, type Language } from "@/i18n/translations";
import { useSiteSettings } from "@/hooks/useSiteSettings";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  languages: Language[];
  multiLanguageEnabled: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const getStoredLanguage = (): Language => {
  try {
    const stored = localStorage.getItem("preferred_language");
    if (stored) {
      const lang = supportedLanguages.find((l) => l.code === stored);
      if (lang) return lang;
    }
  } catch {}
  return supportedLanguages[0]; // English default
};

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguageState] = useState<Language>(getStoredLanguage);
  const { settings } = useSiteSettings();

  const multiLanguageEnabled = settings.multi_language_enabled_setting === "true";
  const enabledCodes = (settings.enabled_languages || "en").split(",").filter(Boolean);
  const defaultCode = settings.default_language_code || "en";

  // Filter languages to only enabled ones
  const availableLanguages = useMemo(() => {
    if (!multiLanguageEnabled) return [];
    return supportedLanguages.filter((l) => enabledCodes.includes(l.code));
  }, [multiLanguageEnabled, enabledCodes.join(",")]);

  // Set default language from settings on first load
  useEffect(() => {
    if (defaultCode && !localStorage.getItem("preferred_language")) {
      const defaultLang = supportedLanguages.find((l) => l.code === defaultCode);
      if (defaultLang) setLanguageState(defaultLang);
    }
  }, [defaultCode]);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem("preferred_language", lang.code);
    document.documentElement.dir = lang.dir;
    document.documentElement.lang = lang.code;
  }, []);

  useEffect(() => {
    document.documentElement.dir = language.dir;
    document.documentElement.lang = language.code;
  }, [language]);

  const t = useCallback(
    (key: string): string => {
      const langTranslations = translations[language.code];
      if (langTranslations && langTranslations[key]) return langTranslations[key];
      return translations.en?.[key] || key;
    },
    [language.code]
  );

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, languages: availableLanguages, multiLanguageEnabled }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
};
