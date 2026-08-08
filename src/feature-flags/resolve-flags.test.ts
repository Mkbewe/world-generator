import { FLAG_DEFAULTS } from './flags';
import { resolveFlags } from './resolve-flags';

describe('resolveFlags', () => {
  it('should return defaults when remote is empty', () => {
    expect(resolveFlags({})).toEqual(FLAG_DEFAULTS);
  });

  it('should override a boolean flag with a boolean value', () => {
    const flags = resolveFlags({ test: true });

    expect(flags.test).toBe(true);
    expect(flags.mapStyle).toBe(FLAG_DEFAULTS.mapStyle);
  });

  it('should override a string flag with an allowed value', () => {
    const flags = resolveFlags({ mapStyle: 'fantasy' });

    expect(flags.mapStyle).toBe('fantasy');
  });

  it('should ignore a string value that is not in the allowed options', () => {
    const flags = resolveFlags({ mapStyle: 'watercolor' });

    expect(flags.mapStyle).toBe(FLAG_DEFAULTS.mapStyle);
  });

  it('should ignore unknown keys', () => {
    const flags = resolveFlags({ somethingElse: true });

    expect(flags).toEqual(FLAG_DEFAULTS);
  });

  it('should ignore values of the wrong type', () => {
    const flags = resolveFlags({ test: 'true', mapStyle: 1 });

    expect(flags).toEqual(FLAG_DEFAULTS);
  });

  it('should return defaults when remote is not an object', () => {
    expect(resolveFlags(null)).toEqual(FLAG_DEFAULTS);
    expect(resolveFlags(undefined)).toEqual(FLAG_DEFAULTS);
    expect(resolveFlags('test')).toEqual(FLAG_DEFAULTS);
  });
});
