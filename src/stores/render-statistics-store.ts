import { createStore } from './create-store';
import type { RenderStatistics } from '../utils/map-renderer';

interface RenderStatisticsState {
  statistics?: RenderStatistics;
  setResult: (statistics: RenderStatistics) => void;
}

export const useRenderStatisticsStore = createStore<RenderStatisticsState>(set => ({
  setResult: statistics => set({ statistics }),
}));
