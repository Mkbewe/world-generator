import { type GeologyPreset, geologyPresetConfig } from '@generator/stages/geology';
import { defaultRegionTerrain } from '@generator/stages/heightmap';
import type { GeologicalRegionConfig } from '@generator/types';

import { useGeologyFormStore } from '../geology-form';
import { useHeightmapFormStore } from '../heightmap-form';

/** Applies a geology preset together with the terrain defaults it implies. */
export function applyGeologyPreset(preset: GeologyPreset): void {
  const config = geologyPresetConfig(preset);

  useGeologyFormStore.getState().applyPreset(preset);
  useHeightmapFormStore.getState().resetRegionTerrains(config.regions.map(region => region.type));
}

/** Updates a geological region and resets its terrain when its type changes. */
export function updateGeologicalRegion(
  index: number,
  patch: Partial<GeologicalRegionConfig>
): void {
  const terrain = patch.type ? defaultRegionTerrain(patch.type) : undefined;

  useGeologyFormStore.getState().setRegion(index, patch);
  if (terrain !== undefined) {
    useHeightmapFormStore.getState().setRegionTerrain(index, terrain);
  }
}
