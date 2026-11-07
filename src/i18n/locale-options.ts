import type { Locale } from './locale';

export interface LocalePresentation {
  readonly flagUrl: string;
  /** Endonym: a language name always written in that language. */
  readonly label: string;
}

export const LOCALE_OPTIONS: Readonly<Record<Locale, LocalePresentation>> = {
  en: { flagUrl: '/flags/gb.svg', label: 'English' },
  pl: { flagUrl: '/flags/pl.svg', label: 'Polski' },
};
