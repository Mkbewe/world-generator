import { DEFAULT_LANDMASS_CONFIG } from '../../utils/map-generator/stages/landmass-defaults';
import { LANDMASS_ARCHETYPES } from '../../utils/map-generator/stages/landmass-layout/archetypes';
import type { LandmassArchetype, LandmassConfig } from '../../utils/map-generator/types';
import { createStore } from '../create-store';

export const LANDMASS_FORM_DEFAULTS = { landmasses: DEFAULT_LANDMASS_CONFIG };

interface LandmassFormState {
  landmasses: LandmassConfig;
  setCount: (count: number) => void;
  setSize: (size: number) => void;
  /** An empty selection keeps the pool empty, so the layout draws nothing. */
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
  setArchetypes: archetypes =>
    set(state => {
      const selected = LANDMASS_ARCHETYPES.filter(item => archetypes.includes(item));
      return {
        landmasses: {
          ...state.landmasses,
          archetypes: selected.length === LANDMASS_ARCHETYPES.length ? undefined : [...selected],
        },
      };
    }),
}));
