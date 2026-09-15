import type { WorldSize } from './world-shape';

interface SizePreset {
  readonly value: string;
  readonly label: string;
  /** Physical world side length in meters. */
  readonly sizeMeters: WorldSize;
}

export const SIZE_PRESETS: readonly SizePreset[] = [
  { value: 'small', label: 'Small', sizeMeters: 1000 },
  { value: 'medium', label: 'Medium', sizeMeters: 2000 },
  { value: 'big', label: 'Big', sizeMeters: 4000 },
];
