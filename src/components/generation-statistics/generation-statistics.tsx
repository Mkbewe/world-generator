import { QuestionMarkCircledIcon } from '@radix-ui/react-icons';
import { Card, Flex, Heading, Separator, Text, Tooltip } from '@radix-ui/themes';

import { describeMetric, type MetricDescriptor } from './metric-descriptors';
import type { GenerationSummary } from '../../stores';
import type { StageMetric, StageStatistics } from '../../utils/map-generator';
import styles from './generation-statistics.module.scss';

interface GenerationStatisticsProps {
  statistics: readonly StageStatistics[];
  totalDurationMs?: number;
  summary?: GenerationSummary;
}

export function GenerationStatistics({
  statistics,
  totalDurationMs,
  summary,
}: GenerationStatisticsProps) {
  return (
    <Card size={{ initial: '2', sm: '3' }}>
      <Flex direction='column' gap='4'>
        <Heading size='5' color='violet'>
          Statistics
        </Heading>
        <Separator size='4' />
        {summary && <SummaryGrid summary={summary} totalDurationMs={totalDurationMs} />}
        <TimingBreakdown statistics={statistics} totalDurationMs={totalDurationMs} />
        <Flex direction='column' gap='3'>
          {statistics.map(stage => (
            <StageSection key={stage.stageId} stage={stage} />
          ))}
        </Flex>
      </Flex>
    </Card>
  );
}

function SummaryGrid({
  summary,
  totalDurationMs,
}: {
  summary: GenerationSummary;
  totalDurationMs?: number;
}) {
  const items = [
    { label: 'Seed', value: summary.seed, description: 'Seed used for deterministic generation.' },
    {
      label: 'Size',
      value: `${summary.width} × ${summary.height}`,
      description: 'World grid size in cells.',
    },
    { label: 'Shape', value: summary.shape, description: 'World shape preset.' },
    {
      label: 'Cells',
      value: formatNumber(summary.cells),
      description: 'Total number of cells (width × height).',
    },
    {
      label: 'Data',
      value: formatBytes(summary.bytes),
      description: 'Total size of the generated layer data.',
    },
    {
      label: 'Total time',
      value: formatDuration(totalDurationMs),
      description: 'Wall-clock time of the whole generation run.',
    },
  ];

  return (
    <div className={styles.summary}>
      {items.map(item => (
        <div key={item.label} className={styles.summaryItem}>
          <MetricLabel label={item.label} description={item.description} />
          <Text size='3' weight='bold'>
            {item.value}
          </Text>
        </div>
      ))}
    </div>
  );
}

function TimingBreakdown({
  statistics,
  totalDurationMs,
}: {
  statistics: readonly StageStatistics[];
  totalDurationMs?: number;
}) {
  const stageTotal = statistics.reduce((sum, stage) => sum + stage.durationMs, 0);
  const total = totalDurationMs ?? stageTotal;
  if (statistics.length === 0 || total <= 0) {
    return null;
  }
  const overhead = Math.max(0, total - stageTotal);

  return (
    <Flex direction='column' gap='2'>
      <Text size='2' weight='bold' color='gray'>
        Timing
      </Text>
      <div className={styles.timeline}>
        {statistics.map((stage, index) => (
          <div
            key={stage.stageId}
            className={styles.timelineSegment}
            data-index={index % 4}
            style={{ width: `${(stage.durationMs / total) * 100}%` }}
            title={`${stage.stageName}: ${formatDuration(stage.durationMs)}`}
          />
        ))}
        {overhead > 0 && (
          <div
            className={styles.timelineOverhead}
            style={{ width: `${(overhead / total) * 100}%` }}
            title={`Overhead: ${formatDuration(overhead)}`}
          />
        )}
      </div>
      <Flex gap='3' wrap='wrap'>
        {statistics.map((stage, index) => (
          <Flex key={stage.stageId} align='center' gap='1'>
            <span className={styles.timelineDot} data-index={index % 4} />
            <Text size='2' color='gray'>
              {stage.stageName} · {formatDuration(stage.durationMs)}
            </Text>
          </Flex>
        ))}
        {overhead > 0 && (
          <Flex align='center' gap='1'>
            <span className={styles.timelineDot} data-index='overhead' />
            <Text size='2' color='gray'>
              Overhead · {formatDuration(overhead)}
            </Text>
          </Flex>
        )}
      </Flex>
    </Flex>
  );
}

function StageSection({ stage }: { stage: StageStatistics }) {
  const entries = Object.entries(stage.details ?? {});

  return (
    <div className={styles.stage}>
      <Flex justify='between' align='center' gap='3'>
        <Text size='2' weight='bold'>
          {stage.stageName}
        </Text>
        <Text size='2' color='gray'>
          {formatDuration(stage.durationMs)}
        </Text>
      </Flex>
      {entries.length > 0 && (
        <div className={styles.metrics}>
          {entries.map(([key, value]) => {
            const descriptor = describeMetric(key);
            return (
              <div key={key} className={styles.metric}>
                <MetricLabel label={descriptor.label} description={descriptor.description} />
                <Text size='2'>{formatMetric(value, descriptor)}</Text>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function MetricLabel({ label, description }: { label: string; description: string }) {
  return (
    <Flex align='center' gap='1'>
      <Text size='2' color='gray'>
        {label}
      </Text>
      {description && (
        <Tooltip content={description} delayDuration={200}>
          <span className={styles.help}>
            <QuestionMarkCircledIcon />
          </span>
        </Tooltip>
      )}
    </Flex>
  );
}

function formatMetric(value: StageMetric, descriptor: MetricDescriptor): string {
  if (typeof value === 'string') {
    return value;
  }
  switch (descriptor.kind) {
    case 'ratio':
      return `${(value * 100).toFixed(1)}%`;
    case 'bytes':
      return formatBytes(value);
    case 'duration':
      return formatDuration(value);
    default:
      return formatNumber(value, descriptor.precision);
  }
}

function formatNumber(value: number, precision?: number): string {
  if (precision === undefined) {
    return Math.round(value).toLocaleString('en-US');
  }
  return value.toFixed(precision);
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDuration(ms: number | undefined): string {
  if (ms === undefined) {
    return '—';
  }
  return ms < 1000 ? `${ms.toFixed(1)} ms` : `${(ms / 1000).toFixed(2)} s`;
}
