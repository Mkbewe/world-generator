import { DEFAULT_GEOLOGY_CONFIG } from '../../../utils/map-generator/stages/geology';
import {
  DEFAULT_HEIGHTMAP_CONFIG,
  defaultRegionTerrainSlots,
  MAX_ISLET_FREQUENCY,
  MAX_RELIEF,
  MIN_ISLET_FREQUENCY,
  MIN_RELIEF,
} from '../../../utils/map-generator/stages/heightmap';
import type {
  GeologicalRegionType,
  HeightmapConfig,
  RegionTerrainConfig,
} from '../../../utils/map-generator/types';
import { createStore } from '../../create-store';

/**
 * Form state of the Heightmap tab. `slots` always holds every editable
 * region terrain; only the first `regionCount` entries cross into the map
 * configuration, so lowering the geology count and raising it again restores
 * the user's edits.
 */
interface HeightmapFormState {
  heightmap: HeightmapConfig;
  slots: readonly RegionTerrainConfig[];
  setRelief: (relief: number) => void;
  setIsletFrequency: (isletFrequency: number) => void;
  setRegionTerrain: (index: number, patch: Partial<RegionTerrainConfig>) => void;
  resetRegionTerrains: (types: readonly GeologicalRegionType[]) => void;
}

export const HEIGHTMAP_FORM_DEFAULTS: Pick<HeightmapFormState, 'heightmap' | 'slots'> = {
  heightmap: DEFAULT_HEIGHTMAP_CONFIG,
  slots: defaultRegionTerrainSlots(DEFAULT_GEOLOGY_CONFIG.regions.map(region => region.type)),
};

export const useHeightmapFormStore = createStore<HeightmapFormState>(set => ({
  ...HEIGHTMAP_FORM_DEFAULTS,
  setRelief: relief =>
    set(state => ({
      heightmap: { ...state.heightmap, relief: clamp(relief, MIN_RELIEF, MAX_RELIEF) },
    })),
  setIsletFrequency: isletFrequency =>
    set(state => ({
      heightmap: {
        ...state.heightmap,
        isletFrequency: clamp(isletFrequency, MIN_ISLET_FREQUENCY, MAX_ISLET_FREQUENCY),
      },
    })),
  setRegionTerrain: (index, patch) =>
    set(state => ({
      slots: state.slots.map((slot, slotIndex) =>
        slotIndex === index ? { ...slot, ...patch } : slot
      ),
    })),
  resetRegionTerrains: types => set({ slots: defaultRegionTerrainSlots(types) }),
}));

/** The active terrain slots only; inactive slots stay in the form state. */
export function heightmapConfigOf(
  state: Pick<HeightmapFormState, 'heightmap' | 'slots'>,
  regionCount: number
): HeightmapConfig {
  return { ...state.heightmap, regions: state.slots.slice(0, regionCount) };
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}
