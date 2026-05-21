import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';

import en from './locales/en.json';
import vi from './locales/vi.json';
import ja from './locales/ja.json';
import zhCN from './locales/zh-CN.json';

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
    supportedLngs: ['en', 'vi', 'ja', 'zh-CN'],
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
      lookupLocalStorage: 'jsonprism.lang',
    },
  });
