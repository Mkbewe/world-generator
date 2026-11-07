import type { WorldSize } from './world-shape';
import type { MessageKey } from '../../../../../i18n';

interface SizePreset {
  readonly value: string;
  readonly labelKey: MessageKey;
  /** Physical world side length in meters. */
  readonly sizeMeters: WorldSize;
}

export const SIZE_PRESETS: readonly SizePreset[] = [
  { value: 'small', labelKey: 'forms.worldShape.sizeSmall', sizeMeters: 3000 },
  { value: 'medium', labelKey: 'forms.worldShape.sizeMedium', sizeMeters: 6000 },
  { value: 'big', labelKey: 'forms.worldShape.sizeBig', sizeMeters: 12_000 },
];
