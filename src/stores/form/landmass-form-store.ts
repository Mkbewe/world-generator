import {
  DEFAULT_LANDMASS_CONFIG,
  LANDMASS_ARCHETYPES,
} from '../../utils/map-generator/stages/landmass';
import type { LandmassArchetype, LandmassConfig } from '../../utils/map-generator/types';
import { createStore } from '../create-store';

export const LANDMASS_FORM_DEFAULTS = { landmasses: DEFAULT_LANDMASS_CONFIG };

interface LandmassFormState {
  landmasses: LandmassConfig;
  setCount: (count: number) => void;
  setSize: (size: number) => void;
  setDiversity: (diversity: number) => void;
  /** Narrows the pool; a valid configuration always keeps one intent enabled. */
  setArchetypes: (archetypes: readonly LandmassArchetype[]) => void;
}

/** Archetypes enabled in the pool; an undefined pool means every archetype. */
export function selectedArchetypes(landmasses: LandmassConfig): readonly LandmassArchetype[] {
  return landmasses.archetypes ?? LANDMASS_ARCHETYPES;
}

export const useLandmassFormStore = createStore<LandmassFormState>(set => ({
  ...LANDMASS_FORM_DEFAULTS,
  setCount: count => set(state => ({ landmasses: { ...state.landmasses, count } })),
  setSize: size => set(state => ({ landmasses: { ...state.landmasses, size } })),
  setDiversity: diversity => set(state => ({ landmasses: { ...state.landmasses, diversity } })),
  setArchetypes: archetypes =>
    set(state => {
      const selected = LANDMASS_ARCHETYPES.filter(item => archetypes.includes(item));
      if (selected.length === 0) {
        // An empty pool would draw no structures at all, so the last intent stays.
        return state;
      }
      return {
        landmasses: {
          ...state.landmasses,
          archetypes: selected.length === LANDMASS_ARCHETYPES.length ? undefined : [...selected],
        },
      };
    }),
}));
