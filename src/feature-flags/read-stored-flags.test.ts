import { FLAG_DEFAULTS } from './flags';
import { FLAGS_STORAGE_KEY, readStoredFlags } from './read-stored-flags';

describe('readStoredFlags', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  it('initializes the entry with the defaults when missing', () => {
    expect(readStoredFlags()).toEqual(FLAG_DEFAULTS);
    expect(JSON.parse(window.localStorage.getItem(FLAGS_STORAGE_KEY) ?? 'null')).toEqual(
      FLAG_DEFAULTS
    );
  });

  it('applies valid stored values', () => {
    window.localStorage.setItem(FLAGS_STORAGE_KEY, JSON.stringify({ breadcrumbs: true }));

    expect(readStoredFlags()).toEqual({ breadcrumbs: true });
  });

  it('uses the defaults for malformed JSON', () => {
    window.localStorage.setItem(FLAGS_STORAGE_KEY, '{not json');

    expect(readStoredFlags()).toEqual(FLAG_DEFAULTS);
  });

  it('uses the defaults for invalid values', () => {
    window.localStorage.setItem(FLAGS_STORAGE_KEY, JSON.stringify({ breadcrumbs: 'true' }));

    expect(readStoredFlags()).toEqual(FLAG_DEFAULTS);
  });

  it('uses the defaults when storage cannot be read', () => {
    const storage = {
      getItem: () => {
        throw new Error('Storage is unavailable.');
      },
    } as unknown as Storage;

    expect(readStoredFlags(storage)).toEqual(FLAG_DEFAULTS);
  });
});
