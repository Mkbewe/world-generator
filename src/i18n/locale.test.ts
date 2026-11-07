import { DEFAULT_LOCALE, isLocale, resolveLocale } from './locale';

describe('resolveLocale', () => {
  it('keeps a shipped locale', () => {
    expect(resolveLocale('en')).toBe('en');
  });

  it('falls back to the default locale for an unknown value', () => {
    expect(resolveLocale('de')).toBe(DEFAULT_LOCALE);
    expect(resolveLocale(undefined)).toBe(DEFAULT_LOCALE);
    expect(resolveLocale(null)).toBe(DEFAULT_LOCALE);
  });
});

describe('isLocale', () => {
  it('recognises only shipped locales', () => {
    expect(isLocale('en')).toBe(true);
    expect(isLocale('de')).toBe(false);
  });
});
