/** Stable id of the region at a zero-based index. */
export function regionId(index: number): string {
  return `region-${index + 1}`;
}

/** Zero-based index parsed from a region id, or undefined for another id. */
export function regionIndex(id: string | undefined): number | undefined {
  const match = id ? /^region-(\d+)$/.exec(id) : null;
  return match ? Number(match[1]) - 1 : undefined;
}
