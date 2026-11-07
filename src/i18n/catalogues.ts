import en, { type MessageKey } from './locales/en';

/** Every catalogue must contain every message key. */
export type Catalogue = Record<MessageKey, string>;

/** All shipped catalogues. Adding a locale is a single entry here. */
export const CATALOGUES = {
  en,
} satisfies Record<string, Catalogue>;

export type Locale = keyof typeof CATALOGUES;

export const SUPPORTED_LOCALES: readonly Locale[] = Object.keys(CATALOGUES).filter(
  (locale): locale is Locale => Object.hasOwn(CATALOGUES, locale)
);
