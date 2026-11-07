import { DEFAULT_LOCALE } from './locale';
import { readStoredLocale, storeLocale } from './locale-storage';

const STORAGE_KEY = 'world-generator.locale';

describe('locale storage', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('returns the default locale when nothing is stored', () => {
    expect(readStoredLocale()).toBe(DEFAULT_LOCALE);
  });

  it('restores a stored locale', () => {
    storeLocale('en');

    expect(readStoredLocale()).toBe('en');
  });

  it('ignores a locale without a catalogue', () => {
    window.localStorage.setItem(STORAGE_KEY, 'pl');

    expect(readStoredLocale()).toBe(DEFAULT_LOCALE);
  });
});
