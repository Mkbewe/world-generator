export interface TerrainDetailOption {
  readonly value: string;
  readonly label: string;
  /** Physical size of one sample in meters. */
  readonly metersPerSample: number;
}

export const TERRAIN_DETAIL_OPTIONS: readonly TerrainDetailOption[] = [
  { value: 'normal', label: '1 m', metersPerSample: 1 },
  { value: 'coarse', label: '2 m', metersPerSample: 2 },
  { value: 'rough', label: '4 m', metersPerSample: 4 },
  { value: 'broad', label: '8 m', metersPerSample: 8 },
  { value: 'distant', label: '16 m', metersPerSample: 16 },
];
