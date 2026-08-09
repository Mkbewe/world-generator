import { resolveFlags } from './resolve-flags';

const DEFAULTS = { enabled: false, mode: 'a' };
const OPTIONS = { mode: ['a', 'b', 'c'] };

describe('resolveFlags', () => {
  it('should return defaults when remote is empty', () => {
    expect(resolveFlags({}, DEFAULTS, OPTIONS)).toEqual(DEFAULTS);
  });

  it('should override a boolean flag with a boolean value', () => {
    expect(resolveFlags({ enabled: true }, DEFAULTS, OPTIONS)).toEqual({
      enabled: true,
      mode: 'a',
    });
  });

  it('should ignore a boolean flag set to a non-boolean value', () => {
    expect(resolveFlags({ enabled: 'true' }, DEFAULTS, OPTIONS)).toEqual(DEFAULTS);
  });

  it('should override a string flag with an allowed value', () => {
    expect(resolveFlags({ mode: 'b' }, DEFAULTS, OPTIONS)).toEqual({
      enabled: false,
      mode: 'b',
    });
  });

  it('should ignore a string value outside the allowed options', () => {
    expect(resolveFlags({ mode: 'z' }, DEFAULTS, OPTIONS)).toEqual(DEFAULTS);
  });

  it('should ignore a string flag set to a non-string value', () => {
    expect(resolveFlags({ mode: 1 }, DEFAULTS, OPTIONS)).toEqual(DEFAULTS);
  });

  it('should ignore unknown keys', () => {
    expect(resolveFlags({ somethingElse: true }, DEFAULTS, OPTIONS)).toEqual(DEFAULTS);
  });

  it('should return defaults when remote is not an object', () => {
    expect(resolveFlags(null, DEFAULTS, OPTIONS)).toEqual(DEFAULTS);
    expect(resolveFlags(undefined, DEFAULTS, OPTIONS)).toEqual(DEFAULTS);
    expect(resolveFlags('test', DEFAULTS, OPTIONS)).toEqual(DEFAULTS);
  });
});
