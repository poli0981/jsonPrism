import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';

import en from './locales/en.json';
import vi from './locales/vi.json';
import ja from './locales/ja.json';
import zhCN from './locales/zh-CN.json';

const SUPPORTED_LANGUAGES = ['en', 'vi', 'ja', 'zh-CN'] as const;

/** Keeps <html lang> in sync so screen readers and CJK glyph selection follow the UI language. */
function syncDocumentLanguage(language: string | undefined): void {
  if (typeof document !== 'undefined' && language) document.documentElement.lang = language;
}

i18n.on('languageChanged', syncDocumentLanguage);

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      vi: { translation: vi },
      ja: { translation: ja },
      'zh-CN': { translation: zhCN },
    },
    fallbackLng: 'en',
    supportedLngs: [...SUPPORTED_LANGUAGES],
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
      lookupLocalStorage: 'jsonprism.lang',
    },
  })
  .then(() => syncDocumentLanguage(i18n.resolvedLanguage));
