/** Formats a 0..1 share as a whole percent, e.g. 0.42 becomes "42%". */
export const percent = (value: number): string => `${Math.round(value * 100)}%`;
