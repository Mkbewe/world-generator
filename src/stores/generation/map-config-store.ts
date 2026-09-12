import type { MapConfig } from '../../utils/map-generator';
import { createStore } from '../create-store';

interface MapConfigState {
  config?: MapConfig;
  setConfig: (config: MapConfig | undefined) => void;
}

export const useMapConfigStore = createStore<MapConfigState>(set => ({
  setConfig: config => set({ config }),
}));
