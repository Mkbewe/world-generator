/** Locale used when none is resolved or a requested locale is unknown. */
export const DEFAULT_LOCALE = 'en';

/** Locales shipped with the app; add a catalogue before adding a locale here. */
export const SUPPORTED_LOCALES = ['en'] as const;

export type Locale = (typeof SUPPORTED_LOCALES)[number];

/** Whether a runtime value is one of the shipped locales. */
export function isLocale(value: string): value is Locale {
  return SUPPORTED_LOCALES.some(locale => locale === value);
}

/** Resolves a requested locale, falling back to the default one. */
export function resolveLocale(value: string | undefined | null): Locale {
  return value !== undefined && value !== null && isLocale(value) ? value : DEFAULT_LOCALE;
}
