export interface StatisticsSummaryItem {
  label: string;
  value: string;
  description: string;
}

export interface StatisticsMetric {
  label: string;
  value: string;
  description: string;
}

export interface StatisticsSection {
  key: string;
  title: string;
  trailing?: string;
  metrics: readonly StatisticsMetric[];
}
