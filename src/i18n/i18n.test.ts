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
    expect(i18n.t('footer.version', { name: 'World Generator', version: '1.2.3' })).toBe(
      'World Generator v1.2.3'
    );
  });

  it('reports an unknown key as missing', () => {
    expect(i18n.exists('missing.key')).toBe(false);
  });

  it('does not fall back to another locale for missing translations', () => {
    expect(i18n.options.fallbackLng).toBe(false);
  });
});
