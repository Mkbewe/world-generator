import { createStore } from './create-store';
import type { StageStatistics } from '../utils/map-generator';

export interface GenerationStatistics {
  statistics: readonly StageStatistics[];
  totalDurationMs: number;
}

interface GenerationStatisticsState {
  result?: GenerationStatistics;
  setResult: (result: GenerationStatistics | undefined) => void;
}

export const useGenerationStatisticsStore = createStore<GenerationStatisticsState>(set => ({
  setResult: result => set({ result }),
}));
