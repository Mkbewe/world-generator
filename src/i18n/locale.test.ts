import { DEFAULT_LOCALE, isLocale, resolveLocale, SUPPORTED_LOCALES } from './locale';

describe('resolveLocale', () => {
  it.each(SUPPORTED_LOCALES)('keeps the shipped locale %s', locale => {
    expect(resolveLocale(locale)).toBe(locale);
  });

  it('falls back to the default locale for an unknown value', () => {
    expect(resolveLocale('de')).toBe(DEFAULT_LOCALE);
    expect(resolveLocale(undefined)).toBe(DEFAULT_LOCALE);
    expect(resolveLocale(null)).toBe(DEFAULT_LOCALE);
  });
});

describe('isLocale', () => {
  it.each(SUPPORTED_LOCALES)('recognises the shipped locale %s', locale => {
    expect(isLocale(locale)).toBe(true);
  });

  it('rejects a locale without a catalogue', () => {
    expect(isLocale('de')).toBe(false);
  });
});
