import type { GenerationStatistics } from '../../../stores';
import type { WorldConfig } from '../../../utils/map-generator';
import type { RenderStatistics } from '../../../utils/map-renderer';

/** Everything the statistics page shows: the map, its generation and its rendering. */
export interface StatisticsSnapshot {
  readonly world: WorldConfig;
  readonly generation: GenerationStatistics;
  readonly rendering: RenderStatistics | null;
}

/** `world-statistics-123456.json`, named after the map seed. */
export function statisticsExportFileName(world: WorldConfig): string {
  return `world-statistics-${world.seed}.json`;
}

/** Downloads the snapshot as a pretty-printed JSON file. */
export function downloadStatisticsExport(snapshot: StatisticsSnapshot, fileName: string): void {
  const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}
