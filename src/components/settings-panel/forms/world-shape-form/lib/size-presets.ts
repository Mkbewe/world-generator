import type { WorldSize } from './world-shape';

interface SizePreset {
  readonly value: string;
  readonly label: string;
  readonly size: WorldSize;
}

export const SIZE_PRESETS: readonly SizePreset[] = [
  { value: 'small', label: 'Small', size: 600 },
  { value: 'medium', label: 'Medium', size: 2400 },
  { value: 'big', label: 'Big', size: 5000 },
];
