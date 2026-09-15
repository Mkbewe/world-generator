import type { WorldShape, WorldSize } from '../../components/settings-panel/forms';
import { createStore } from '../create-store';

export const DEFAULT_WORLD_SIZE = 1000;
export const DEFAULT_TERRAIN_DETAIL = 1;

export const WORLD_SHAPE_FORM_DEFAULTS: {
  shape: WorldShape;
  sizeMeters: WorldSize;
  metersPerSample: number;
} = {
  shape: 'disc',
  sizeMeters: DEFAULT_WORLD_SIZE,
  metersPerSample: DEFAULT_TERRAIN_DETAIL,
};

interface WorldShapeFormState {
  shape: WorldShape;
  /** Physical world side length in meters. */
  sizeMeters: WorldSize;
  /** Terrain detail expressed as meters per sample. */
  metersPerSample: number;
  setShape: (shape: WorldShape) => void;
  setSizeMeters: (sizeMeters: WorldSize) => void;
  setMetersPerSample: (metersPerSample: number) => void;
}

export const useWorldShapeFormStore = createStore<WorldShapeFormState>(set => ({
  ...WORLD_SHAPE_FORM_DEFAULTS,
  setShape: shape => set({ shape }),
  setSizeMeters: sizeMeters => set({ sizeMeters }),
  setMetersPerSample: metersPerSample => set({ metersPerSample }),
}));
