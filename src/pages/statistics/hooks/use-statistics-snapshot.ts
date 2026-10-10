import {
  useGenerationStatisticsStore,
  useMapConfigStore,
  useRenderStatisticsStore,
} from '../../../stores';
import type { StatisticsSnapshot } from '../lib/statistics-export';

/**
 * The one source of what the statistics page shows. The page renders its panels
 * from this snapshot and the export saves exactly the same object, so a new
 * field in any of the three sources reaches both without a second edit.
 */
export function useStatisticsSnapshot(): StatisticsSnapshot | undefined {
  const world = useMapConfigStore(state => state.config?.world);
  const generation = useGenerationStatisticsStore(state => state.result);
  const rendering = useRenderStatisticsStore(state => state.statistics);
  if (!world || !generation) {
    return undefined;
  }
  return { world, generation, rendering: rendering ?? null };
}
