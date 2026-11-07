import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { type Locale, resolveLocale, storeLocale } from '../i18n';

export function useLocale(): { locale: Locale; setLocale: (locale: Locale) => void } {
  const { i18n } = useTranslation();
  const locale = resolveLocale(i18n.language);

  const setLocale = useCallback(
    (next: Locale) => {
      storeLocale(next);
      void i18n.changeLanguage(next);
    },
    [i18n]
  );

  return { locale, setLocale };
}
