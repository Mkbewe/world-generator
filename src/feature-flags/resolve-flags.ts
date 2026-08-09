export function resolveFlags<T extends Record<string, boolean | string>>(
  remote: unknown,
  defaults: T,
  options: Partial<Record<keyof T, readonly string[]>>
): T {
  const resolved: T = { ...defaults };

  if (typeof remote !== 'object' || remote === null) {
    return resolved;
  }

  const source = remote as Record<string, unknown>;
  for (const name of Object.keys(defaults) as (keyof T)[]) {
    const value = source[name as string];
    const allowed = options[name];
    const isValid = allowed
      ? typeof value === 'string' && allowed.includes(value)
      : typeof value === 'boolean';

    if (isValid) {
      (resolved as Record<string, unknown>)[name as string] = value;
    }
  }

  return resolved;
}
