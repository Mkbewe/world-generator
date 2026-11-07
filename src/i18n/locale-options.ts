import type { MessageKey } from './locales/en';
import type { Locale } from './locale';

export interface LocalePresentation {
  readonly flagUrl: string;
  readonly labelKey: MessageKey;
}

export const LOCALE_OPTIONS: Readonly<Record<Locale, LocalePresentation>> = {
  en: { flagUrl: '/flags/gb.svg', labelKey: 'locales.en' },
};
