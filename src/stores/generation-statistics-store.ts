import { createStore } from './create-store';
import type { StageStatistics } from '../utils/map-generator';

interface GenerationStatisticsResult {
  statistics: readonly StageStatistics[];
  totalDurationMs: number;
}

interface GenerationStatisticsState {
  statistics: readonly StageStatistics[];
  totalDurationMs?: number;
  setResult: (result: GenerationStatisticsResult) => void;
}

export const useGenerationStatisticsStore = createStore<GenerationStatisticsState>(set => ({
  statistics: [],
  setResult: result =>
    set({ statistics: result.statistics, totalDurationMs: result.totalDurationMs }),
}));
