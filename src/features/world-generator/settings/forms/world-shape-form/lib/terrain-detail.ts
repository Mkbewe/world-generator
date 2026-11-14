import type { MessageKey } from '../../../../../../i18n';

export interface TerrainDetailOption {
  readonly value: string;
  readonly labelKey: MessageKey;
  /** Physical size of one sample in meters. */
  readonly metersPerSample: number;
}

export const TERRAIN_DETAIL_OPTIONS: readonly TerrainDetailOption[] = [
  { value: 'normal', labelKey: 'forms.worldShape.detail1m', metersPerSample: 1 },
  { value: 'coarse', labelKey: 'forms.worldShape.detail2m', metersPerSample: 2 },
  { value: 'rough', labelKey: 'forms.worldShape.detail4m', metersPerSample: 4 },
  { value: 'broad', labelKey: 'forms.worldShape.detail8m', metersPerSample: 8 },
  { value: 'distant', labelKey: 'forms.worldShape.detail16m', metersPerSample: 16 },
];
