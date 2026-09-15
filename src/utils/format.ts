export type MetricKind = 'number' | 'ratio' | 'bytes' | 'duration' | 'text';

export interface MetricDescriptor {
  label: string;
  kind: MetricKind;
  description: string;
  precision?: number;
}

export function formatNumber(value: number, precision?: number): string {
  if (precision === undefined) {
    return Math.round(value).toLocaleString('en-US');
  }
  return value.toFixed(precision);
}

export function formatBytes(bytes: number): string {
  if (bytes < 1000) {
    return `${bytes} B`;
  }
  if (bytes < 1_000_000) {
    return `${(bytes / 1000).toFixed(1)} KB`;
  }
  return `${Math.round(bytes / 1_000_000)} MB`;
}

export function formatDuration(ms: number | undefined): string {
  if (ms === undefined) {
    return '—';
  }
  return ms < 1000 ? `${ms.toFixed(1)} ms` : `${(ms / 1000).toFixed(2)} s`;
}

export function formatMetric(value: number | string, descriptor: MetricDescriptor): string {
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
