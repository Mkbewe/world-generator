import { DEFAULT_STRUCTURE_CHARACTER_CONFIG } from '../../utils/map-generator';
import type { StructureCharacterConfig } from '../../utils/map-generator/types';
import { createStore } from '../create-store';

export const STRUCTURE_CHARACTER_FORM_DEFAULTS = {
  structureCharacter: DEFAULT_STRUCTURE_CHARACTER_CONFIG,
};

interface StructureCharacterFormState {
  structureCharacter: StructureCharacterConfig;
  /** How often a large structure splits into a second character zone; 0..1. */
  setCharacterVariation: (variation: number) => void;
  /** Leans character draws from flat plains (0) to mountains (1); 0.5 balanced. */
  setTerrainBias: (bias: number) => void;
}

export const useStructureCharacterFormStore = createStore<StructureCharacterFormState>(set => ({
  ...STRUCTURE_CHARACTER_FORM_DEFAULTS,
  setCharacterVariation: characterVariation =>
    set(state => ({ structureCharacter: { ...state.structureCharacter, characterVariation } })),
  setTerrainBias: terrainBias =>
    set(state => ({ structureCharacter: { ...state.structureCharacter, terrainBias } })),
}));
