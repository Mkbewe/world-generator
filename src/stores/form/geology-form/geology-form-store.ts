import {
  DEFAULT_GEOLOGY_CONFIG,
  defaultRegionConfig,
  defaultRegionSlots,
  type GeologyPreset,
  geologyPresetConfig,
  MAX_GEOLOGICAL_REGIONS,
  MAX_REGION_SIZE,
  MIN_GEOLOGICAL_REGIONS,
  MIN_REGION_SIZE,
} from '../../../utils/map-generator/stages/geology';
import type {
  GeologicalRegionConfig,
  GeologyConfig,
  GeologyLayoutConfig,
} from '../../../utils/map-generator/types';
import { createStore } from '../../create-store';

/**
 * Form state of the Geology tab. `slots` always holds every editable position;
 * only the first `regionCount` entries cross into the map configuration, so
 * lowering the count and raising it again restores the user's edits.
 */
interface GeologyFormState {
  regionCount: number;
  layout: GeologyLayoutConfig;
  slots: readonly GeologicalRegionConfig[];
  setRegionCount: (count: number) => void;
  setLayout: (patch: Partial<GeologyLayoutConfig>) => void;
  setRegion: (index: number, patch: Partial<GeologicalRegionConfig>) => void;
  setRegionShareBoundary: (index: number, boundary: number) => void;
  applyPreset: (preset: GeologyPreset) => void;
}

export const GEOLOGY_FORM_DEFAULTS: Pick<GeologyFormState, 'regionCount' | 'layout' | 'slots'> = {
  regionCount: DEFAULT_GEOLOGY_CONFIG.regionCount,
  layout: DEFAULT_GEOLOGY_CONFIG.layout,
  slots: defaultRegionSlots(),
};

export const useGeologyFormStore = createStore<GeologyFormState>(set => ({
  ...GEOLOGY_FORM_DEFAULTS,
  setRegionCount: regionCount =>
    set({ regionCount: clamp(regionCount, MIN_GEOLOGICAL_REGIONS, MAX_GEOLOGICAL_REGIONS) }),
  setLayout: patch => set(state => ({ layout: { ...state.layout, ...patch } })),
  setRegion: (index, patch) =>
    set(state => {
      const slots = state.slots.map((slot, slotIndex) =>
        slotIndex === index ? { ...slot, ...patch } : slot
      );
      return { slots };
    }),
  setRegionShareBoundary: (index, boundary) =>
    set(state => {
      const left = state.slots[index];
      const right = state.slots[index + 1];
      if (
        !left ||
        !right ||
        index < 0 ||
        index + 1 >= state.regionCount ||
        !Number.isFinite(boundary)
      ) {
        return state;
      }
      const active = state.slots.slice(0, state.regionCount);
      const total = active.reduce((sum, slot) => sum + slot.size, 0);
      const before = active.slice(0, index + 1).reduce((sum, slot) => sum + slot.size, 0);
      const desired = (boundary / 100) * total - before;
      const minimum = Math.max(MIN_REGION_SIZE - left.size, right.size - MAX_REGION_SIZE);
      const maximum = Math.min(MAX_REGION_SIZE - left.size, right.size - MIN_REGION_SIZE);
      const delta = Math.max(minimum, Math.min(maximum, desired));
      return {
        slots: state.slots.map((slot, slotIndex) => {
          if (slotIndex === index) {
            return { ...slot, size: slot.size + delta };
          }
          if (slotIndex === index + 1) {
            return { ...slot, size: slot.size - delta };
          }
          return slot;
        }),
      };
    }),
  applyPreset: preset => {
    const config = geologyPresetConfig(preset);
    const slots = config.regions.map(region => ({ ...region }));
    while (slots.length < MAX_GEOLOGICAL_REGIONS) {
      slots.push(defaultRegionConfig());
    }
    set({ regionCount: config.regionCount, layout: config.layout, slots });
  },
}));

/** The active regions only; inactive slots stay in the form state. */
export function geologyConfigOf(
  state: Pick<GeologyFormState, 'regionCount' | 'layout' | 'slots'>
): GeologyConfig {
  return {
    regionCount: state.regionCount,
    layout: state.layout,
    regions: state.slots.slice(0, state.regionCount),
  };
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, Math.round(value)));
}
