/** Formats a palette colour tuple as a CSS `rgb()` string. */
export function colorString(color: readonly [number, number, number]): string {
  return `rgb(${color[0]} ${color[1]} ${color[2]})`;
}
