import type { GeologyPreset } from '../../../../../utils/map-generator';

export interface PresetOption {
  readonly id: GeologyPreset;
  readonly label: string;
}

/** Starter configurations shown at the top of the Geology form. */
export const PRESET_OPTIONS: readonly PresetOption[] = [
  { id: 'varied', label: 'Varied' },
  { id: 'oceanic', label: 'Oceanic' },
  { id: 'vast', label: 'Vast' },
  { id: 'mosaic', label: 'Mosaic' },
];
