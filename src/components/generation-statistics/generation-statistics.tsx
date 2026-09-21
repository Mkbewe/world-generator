import { describeMetric } from './metric-descriptors';
import type { GenerationStatistics } from '../../stores';
import { formatBytes, formatDuration, formatMetric } from '../../utils/format';
import type { StageStatistics } from '../../utils/map-generator';
import { StatisticsPanel, type StatisticsSection } from '../statistics-panel';
import type { TimingSegment } from '../timing-bar';

interface GenerationStatisticsPanelProps {
  statistics: GenerationStatistics;
}

export function GenerationStatisticsPanel({ statistics }: GenerationStatisticsPanelProps) {
  const stages = statistics.statistics;
  const totalDurationMs = statistics.totalDurationMs;
  const totalBytes = stages.reduce((total, stage) => total + (stage.details?.bytes ?? 0), 0);

  // Reused stages report the cost of the run that produced their data, so the
  // displayed cost is the real generation cost of the map.
  const stageTotal = stages.reduce((sum, stage) => sum + stage.durationMs, 0);
  const total = Math.max(stageTotal, totalDurationMs);
  const overhead = total - stageTotal;
  const timing: TimingSegment[] = [
    ...stages.map(stage => ({
      key: stage.stageId,
      label: stage.stageName,
      durationMs: stage.durationMs,
    })),
    ...(overhead > 0
      ? [{ key: 'overhead', label: 'Overhead', durationMs: overhead, muted: true }]
      : []),
  ];

  const sections: StatisticsSection[] = stages.map(stage => ({
    key: stage.stageId,
    title: stage.stageName,
    trailing: stageTrailing(stage),
    metrics: Object.entries(stage.details ?? {}).map(([key, value]) => {
      const descriptor = describeMetric(key);
      return {
        label: descriptor.label,
        value: formatMetric(value, descriptor),
        description: descriptor.description,
      };
    }),
  }));

  return (
    <StatisticsPanel
      title='Generation'
      summary={[
        {
          label: 'Total time',
          value: formatDuration(total),
          description: 'Generation cost of the displayed map, including reused stages.',
        },
        {
          label: 'Total data',
          value: formatBytes(totalBytes),
          description: 'Total size of the data produced by all stages.',
        },
      ]}
      timing={timing}
      sections={sections}
    />
  );
}

/** Real duration of a stage, marked when the last run reused its data. */
function stageTrailing(stage: StageStatistics): string {
  if (stage.status !== 'skipped') {
    return formatDuration(stage.durationMs);
  }
  return stage.durationMs > 0 ? `${formatDuration(stage.durationMs)} · reused` : 'reused';
}
