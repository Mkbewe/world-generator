export interface TerrainDetailOption {
  readonly value: string;
  readonly label: string;
  /** Physical size of one sample in meters. */
  readonly metersPerSample: number;
}

export const TERRAIN_DETAIL_OPTIONS: readonly TerrainDetailOption[] = [
  { value: 'fine', label: '0.5 m', metersPerSample: 0.5 },
  { value: 'normal', label: '1 m', metersPerSample: 1 },
  { value: 'coarse', label: '2 m', metersPerSample: 2 },
  { value: 'rough', label: '4 m', metersPerSample: 4 },
];
