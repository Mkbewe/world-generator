import { CATALOGUES, type Locale, SUPPORTED_LOCALES } from './catalogues';

export { SUPPORTED_LOCALES };
export type { Locale };

/** Locale used when none is resolved or a requested locale is unknown. */
export const DEFAULT_LOCALE: Locale = 'en';

/** Whether a runtime value is one of the shipped locales. */
export function isLocale(value: string): value is Locale {
  return Object.hasOwn(CATALOGUES, value);
}

/** Resolves a requested locale, falling back to the default one. */
export function resolveLocale(value: string | undefined | null): Locale {
  return value !== undefined && value !== null && isLocale(value) ? value : DEFAULT_LOCALE;
}
