import { DEFAULT_LOCALE, type Locale, resolveLocale } from './locale';

const STORAGE_KEY = 'world-generator.locale';

export function readStoredLocale(): Locale {
  try {
    return resolveLocale(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    return DEFAULT_LOCALE;
  }
}

export function storeLocale(locale: Locale): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, locale);
  } catch {
    return;
  }
}
