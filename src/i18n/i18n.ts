import { initReactI18next } from 'react-i18next';
import i18n from 'i18next';

import en from './locales/en';
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from './locale';

/** Completes when the shared i18next instance is ready; tests can await it. */
export const i18nReady = i18n.use(initReactI18next).init({
  resources: {
    en: {
      translation: en,
    },
  },
  lng: DEFAULT_LOCALE,
  fallbackLng: DEFAULT_LOCALE,
  supportedLngs: [...SUPPORTED_LOCALES],
  interpolation: {
    escapeValue: false,
  },
  returnNull: false,
});

export default i18n;
