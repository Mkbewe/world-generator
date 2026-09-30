import type { WorldSize } from './world-shape';

interface SizePreset {
  readonly value: string;
  readonly label: string;
  /** Physical world side length in meters. */
  readonly sizeMeters: WorldSize;
}

export const SIZE_PRESETS: readonly SizePreset[] = [
  { value: 'small', label: 'Small', sizeMeters: 3000 },
  { value: 'medium', label: 'Medium', sizeMeters: 6000 },
  { value: 'big', label: 'Big', sizeMeters: 12_000 },
];
