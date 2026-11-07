import { initReactI18next } from 'react-i18next';
import i18n from 'i18next';

import { CATALOGUES, SUPPORTED_LOCALES } from './catalogues';
import { DEFAULT_LOCALE } from './locale';

const resources = Object.fromEntries(
  Object.entries(CATALOGUES).map(([locale, translation]) => [locale, { translation }])
);

/** Completes when the shared i18next instance is ready; tests can await it. */
export const i18nReady = i18n.use(initReactI18next).init({
  resources,
  lng: DEFAULT_LOCALE,
  fallbackLng: false,
  supportedLngs: [...SUPPORTED_LOCALES],
  keySeparator: false,
  interpolation: {
    escapeValue: false,
  },
  returnNull: false,
});

export default i18n;
