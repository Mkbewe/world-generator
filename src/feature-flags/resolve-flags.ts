import { FLAG_DEFAULTS, FLAG_OPTIONS, type FlagName, type Flags } from './flags';

export function resolveFlags(remote: unknown): Flags {
  const resolved: Flags = { ...FLAG_DEFAULTS };

  if (typeof remote !== 'object' || remote === null) {
    return resolved;
  }

  const source = remote as Record<string, unknown>;
  for (const name of Object.keys(FLAG_DEFAULTS) as FlagName[]) {
    const value = source[name];
    const options = FLAG_OPTIONS[name as keyof typeof FLAG_OPTIONS] as
      readonly string[] | undefined;
    const isValid = options
      ? typeof value === 'string' && options.includes(value)
      : typeof value === 'boolean';

    if (isValid) {
      (resolved as Record<FlagName, unknown>)[name] = value;
    }
  }

  return resolved;
}
