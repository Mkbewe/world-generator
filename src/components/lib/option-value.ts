export function isOneOf<T extends string>(value: string, options: readonly T[]): value is T {
  return options.some(option => option === value);
}
