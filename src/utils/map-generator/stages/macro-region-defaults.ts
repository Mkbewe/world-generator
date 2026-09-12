import type { MacroRegionConfig, MacroRegionDeformation } from '../types';

/** Visible-but-gentle border wobble so the default map is not a perfect target. */
export const DEFAULT_MACRO_DEFORMATION: MacroRegionDeformation = {
  amplitude: 0.08,
  frequency: 3,
  octaves: 2,
  seed: 'macro-region',
};

/**
 * Default narrative layout: a safe centre with progression growing towards the
 * rim. Regions are concentric rings so they never overlap at the shared centre.
 * Works for any world shape because it uses normalized coordinates.
 */
export const DEFAULT_MACRO_REGIONS: readonly MacroRegionConfig[] = [
  {
    id: 'sanctuary',
    label: 'Sanctuary',
    center: { x: 0.5, y: 0.5 },
    innerRadius: 0,
    radius: 0.12,
    falloff: 0.06,
    progression: 0,
  },
  {
    id: 'heartlands',
    label: 'Heartlands',
    center: { x: 0.5, y: 0.5 },
    innerRadius: 0.12,
    radius: 0.24,
    falloff: 0.07,
    progression: 0.35,
  },
  {
    id: 'borderlands',
    label: 'Borderlands',
    center: { x: 0.5, y: 0.5 },
    innerRadius: 0.24,
    radius: 0.36,
    falloff: 0.08,
    progression: 0.65,
  },
  {
    id: 'frontier',
    label: 'Frontier',
    center: { x: 0.5, y: 0.5 },
    innerRadius: 0.36,
    radius: 0.44,
    falloff: 0.12,
    progression: 1,
  },
];
