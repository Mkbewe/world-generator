import type { MessageKey } from '../../i18n';
import type { TimingSegment } from '../timing-bar';

export interface StatisticsMetric {
  key: string;
  labelKey: MessageKey;
  descriptionKey: MessageKey;
  value: string;
}

export interface StatisticsSection {
  key: string;
  titleKey: MessageKey;
  durationMs: number;
  reused?: boolean;
  metrics: readonly StatisticsMetric[];
}

export interface StatisticsViewModel {
  readonly titleKey: MessageKey;
  readonly summary: readonly StatisticsMetric[];
  readonly timing: readonly TimingSegment[];
  readonly unmeasuredDurationMs?: number;
  readonly sections: readonly StatisticsSection[];
}
