import type { WorldSize } from '../../../utils/world-dimensions';
import { DEFAULT_WORLD_SHAPE, type WorldShape } from '../../../utils/world-shape';
import { createStore } from '../../create-store';

/** Default side length: the Medium size preset, in metres. */
export const DEFAULT_WORLD_SIZE = 6000;
/** Default terrain detail: four metres per sample. */
export const DEFAULT_TERRAIN_DETAIL = 4;

export const WORLD_SHAPE_FORM_DEFAULTS: {
  shape: WorldShape;
  sizeMeters: WorldSize;
  metersPerSample: number;
} = {
  shape: DEFAULT_WORLD_SHAPE,
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
