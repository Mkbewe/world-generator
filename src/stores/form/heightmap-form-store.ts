import { DEFAULT_HEIGHTMAP_CONFIG } from '../../utils/map-generator/stages/heightmap';
import type { HeightmapConfig } from '../../utils/map-generator/types';
import { createStore } from '../create-store';

export const HEIGHTMAP_FORM_DEFAULTS = { heightmap: DEFAULT_HEIGHTMAP_CONFIG };

interface HeightmapFormState {
  heightmap: HeightmapConfig;
  /** Rzeźba terenu: 0 = płasko, 1 = bardzo górzysto. */
  setRelief: (relief: number) => void;
}

export const useHeightmapFormStore = createStore<HeightmapFormState>(set => ({
  ...HEIGHTMAP_FORM_DEFAULTS,
  setRelief: relief => set(state => ({ heightmap: { ...state.heightmap, relief } })),
}));
