import { DEFAULT_LOCALE, i18n, i18nReady } from './index';

describe('i18n', () => {
  beforeAll(async () => {
    await i18nReady;
  });

  afterEach(async () => {
    await i18n.changeLanguage(DEFAULT_LOCALE);
  });

  it('translates a known key', () => {
    expect(i18n.t('app.name')).toBe('World Generator');
  });

  it('interpolates named values', () => {
    expect(i18n.t('common.count', { count: 3 })).toBe('3 items');
  });

  it('reports an unknown key as missing', () => {
    expect(i18n.exists('missing.key')).toBe(false);
  });

  it('falls back to the default locale for an unknown language', async () => {
    await i18n.changeLanguage('de');

    expect(i18n.resolvedLanguage).toBe(DEFAULT_LOCALE);
    expect(i18n.t('app.name')).toBe('World Generator');
  });
});
