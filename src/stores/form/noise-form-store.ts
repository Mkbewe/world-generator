import type { NoiseConfig } from '../../utils/map-generator';
import { createStore } from '../create-store';

export const DEFAULT_NOISE: NoiseConfig = {
  frequency: 4,
  octaves: 4,
  persistence: 0.5,
  lacunarity: 2,
};

export const NOISE_FORM_DEFAULTS = { noise: DEFAULT_NOISE };

interface NoiseFormState {
  noise: NoiseConfig;
  setNoise: (noise: NoiseConfig) => void;
}

export const useNoiseFormStore = createStore<NoiseFormState>(set => ({
  ...NOISE_FORM_DEFAULTS,
  setNoise: noise => set({ noise }),
}));
