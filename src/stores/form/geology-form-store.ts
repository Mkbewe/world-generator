import { DEFAULT_SEED } from './general-form-store';
import { WORLD_SHAPE_FORM_DEFAULTS } from './world-shape-form-store';
import {
  createGeographyPreset,
  createGeologicalArea,
  type GeographyPresetId,
  type GeologicalAreaPresetId,
} from '../../utils/map-generator/stages/geology';
import type { GeologicalAreaConfig, GeologyConfig } from '../../utils/map-generator/types';
import { dimensionsFromMeters } from '../../utils/world-dimensions';
import { createStore } from '../create-store';

/** Editable fields of one area; the id stays stable. */
export type GeologicalAreaPatch = Partial<Omit<GeologicalAreaConfig, 'id'>>;

interface GeologyFormState {
  geology: GeologyConfig;
  /** Last applied geography preset, kept for the label while `edited` is set. */
  preset?: GeographyPresetId;
  /** True once the list was changed by hand after the preset. */
  edited: boolean;
  /** Appends one area from a preset with a fresh stable id. */
  addArea: (preset: GeologicalAreaPresetId) => void;
  /** Appends a copy of one area with a fresh id and automatic placement. */
  duplicateArea: (id: string) => void;
  /** Removes one area; an empty list is a valid all-ocean world. */
  removeArea: (id: string) => void;
  /** Updates the editable fields of one area. */
  updateArea: (id: string, patch: GeologicalAreaPatch) => void;
  /** Replaces the list with a geography preset and clears the edited mark. */
  applyPreset: (preset: GeographyPresetId, geology: GeologyConfig) => void;
  refreshPreset: (geology: GeologyConfig) => void;
}

const defaultDimensions = dimensionsFromMeters({
  widthMeters: WORLD_SHAPE_FORM_DEFAULTS.sizeMeters,
  heightMeters: WORLD_SHAPE_FORM_DEFAULTS.sizeMeters,
  metersPerSample: WORLD_SHAPE_FORM_DEFAULTS.metersPerSample,
});

export const GEOLOGY_FORM_DEFAULTS: Pick<GeologyFormState, 'geology' | 'preset' | 'edited'> = {
  geology: createGeographyPreset(
    'random',
    Number(DEFAULT_SEED),
    defaultDimensions,
    WORLD_SHAPE_FORM_DEFAULTS.shape
  ),
  preset: 'random',
  edited: false,
};

/** Fresh `area-N` id that no current area uses. */
function nextAreaId(areas: readonly { id: string }[]): string {
  const taken = new Set(areas.map(area => area.id));
  let counter = areas.length + 1;
  while (taken.has(`area-${counter}`)) {
    counter += 1;
  }
  return `area-${counter}`;
}

/** Manual list change: drops the preset selection, like the macro-region form. */
function editedAreas(areas: readonly GeologicalAreaConfig[]): Partial<GeologyFormState> {
  return { geology: { areas }, preset: undefined, edited: true };
}

export const useGeologyFormStore = createStore<GeologyFormState>(set => ({
  ...GEOLOGY_FORM_DEFAULTS,
  addArea: preset => set(state => editedAreas([...state.geology.areas, createArea(state, preset)])),
  duplicateArea: id =>
    set(state => {
      const area = state.geology.areas.find(candidate => candidate.id === id);
      if (!area) {
        return {};
      }
      const copy: GeologicalAreaConfig = {
        ...area,
        id: nextAreaId(state.geology.areas),
        placement: { kind: 'automatic' },
      };
      return editedAreas([...state.geology.areas, copy]);
    }),
  removeArea: id => set(state => editedAreas(state.geology.areas.filter(area => area.id !== id))),
  updateArea: (id, patch) =>
    set(state =>
      editedAreas(state.geology.areas.map(area => (area.id === id ? { ...area, ...patch } : area)))
    ),
  applyPreset: (preset, geology) =>
    set({
      geology,
      preset,
      edited: false,
    }),
  refreshPreset: geology => set(state => (state.preset && !state.edited ? { geology } : {})),
}));

function createArea(state: GeologyFormState, preset: GeologicalAreaPresetId): GeologicalAreaConfig {
  return createGeologicalArea(nextAreaId(state.geology.areas), preset);
}
