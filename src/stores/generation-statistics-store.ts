import { createStore } from './create-store';
import type { StageStatistics } from '../utils/map-generator';

export interface GenerationSummary {
  seed: string;
  width: number;
  height: number;
  shape: 'disc' | 'rectangle';
  cells: number;
  bytes: number;
}

interface GenerationStatisticsResult {
  statistics: readonly StageStatistics[];
  totalDurationMs?: number;
  summary?: GenerationSummary;
}

interface GenerationStatisticsState {
  statistics: readonly StageStatistics[];
  totalDurationMs?: number;
  summary?: GenerationSummary;
  setResult: (result: GenerationStatisticsResult) => void;
}

export const useGenerationStatisticsStore = createStore<GenerationStatisticsState>(set => ({
  statistics: [],
  setResult: result =>
    set({
      statistics: result.statistics,
      totalDurationMs: result.totalDurationMs,
      summary: result.summary,
    }),
}));
