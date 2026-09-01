// src/lib/i18n.ts

import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import en from "./locales/en.json";
import ar from "./locales/ar.json";
import ja from "./locales/ja.json";
import es from "./locales/es.json";
import fr from "./locales/fr.json";

export const RTL_LANGUAGES = ["ar"];

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      ar: { translation: ar },
      ja: { translation: ja },
      es: { translation: es },
      fr: { translation: fr },
    },
    fallbackLng: "en",
    interpolation: { escapeValue: false },
    // Keep the first render deterministic for SSR/hydration. The persisted or
    // browser locale is applied after mount in the root component.
    detection: {
      order: [],
      caches: ["localStorage"],
      lookupLocalStorage: "aethora_lang",
    },
  });

export function applyDirection(lang: string) {
  if (typeof document === "undefined") return;
  const dir = RTL_LANGUAGES.includes(lang) ? "rtl" : "ltr";
  document.documentElement.dir = dir;
  document.documentElement.lang = lang;
}

export default i18n;
