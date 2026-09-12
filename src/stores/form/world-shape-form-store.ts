import type { WorldShape, WorldSize } from '../../components/settings-panel/forms';
import { createStore } from '../create-store';

export const DEFAULT_WORLD_SIZE = 1000;

export const WORLD_SHAPE_FORM_DEFAULTS: { shape: WorldShape; size: WorldSize } = {
  shape: 'disc',
  size: DEFAULT_WORLD_SIZE,
};

interface WorldShapeFormState {
  shape: WorldShape;
  size: WorldSize;
  setShape: (shape: WorldShape) => void;
  setSize: (size: WorldSize) => void;
}

export const useWorldShapeFormStore = createStore<WorldShapeFormState>(set => ({
  ...WORLD_SHAPE_FORM_DEFAULTS,
  setShape: shape => set({ shape }),
  setSize: size => set({ size }),
}));
