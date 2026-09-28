import {
  createGeologicalArea,
  DEFAULT_GEOLOGY_CONFIG,
  type GeologicalAreaPresetId,
} from '../../utils/map-generator/stages/geology';
import type { GeologyConfig } from '../../utils/map-generator/types';
import { createStore } from '../create-store';

export const GEOLOGY_FORM_DEFAULTS = { geology: DEFAULT_GEOLOGY_CONFIG };

interface GeologyFormState {
  geology: GeologyConfig;
  /** Appends one area from a preset with a fresh stable id. */
  addArea: (preset: GeologicalAreaPresetId) => void;
  /** Removes one area; an empty list is a valid all-ocean world. */
  removeArea: (id: string) => void;
  /** Resizes one area influence; automatic placement may move its centre. */
  setAreaExtent: (id: string, extent: number) => void;
}

/** Fresh `area-N` id that no current area uses. */
function nextAreaId(areas: readonly { id: string }[]): string {
  const taken = new Set(areas.map(area => area.id));
  let counter = areas.length + 1;
  while (taken.has(`area-${counter}`)) {
    counter += 1;
  }
  return `area-${counter}`;
}

export const useGeologyFormStore = createStore<GeologyFormState>(set => ({
  ...GEOLOGY_FORM_DEFAULTS,
  addArea: preset =>
    set(state => ({
      geology: {
        areas: [
          ...state.geology.areas,
          createGeologicalArea(nextAreaId(state.geology.areas), preset),
        ],
      },
    })),
  removeArea: id =>
    set(state => ({ geology: { areas: state.geology.areas.filter(area => area.id !== id) } })),
  setAreaExtent: (id, extent) =>
    set(state => ({
      geology: {
        areas: state.geology.areas.map(area => (area.id === id ? { ...area, extent } : area)),
      },
    })),
}));
