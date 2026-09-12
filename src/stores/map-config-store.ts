import { createStore } from './create-store';
import type { MapConfig } from '../utils/map-generator';

interface MapConfigState {
  config?: MapConfig;
  setConfig: (config: MapConfig | undefined) => void;
}

export const useMapConfigStore = createStore<MapConfigState>(set => ({
  setConfig: config => set({ config }),
}));
