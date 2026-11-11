import type { MessageKey } from '../../../i18n';
import type { MetricKind } from '../../../utils/format';

export interface MetricDescriptorKeys {
  readonly labelKey: MessageKey;
  readonly descriptionKey: MessageKey;
  readonly kind: MetricKind;
  readonly precision?: number;
}

export const METRIC_DESCRIPTORS: Record<string, MetricDescriptorKeys> = {
  shape: {
    labelKey: 'statistics.metrics.shape',
    kind: 'text',
    descriptionKey: 'statistics.metrics.shapeDescription',
  },
  width: {
    labelKey: 'statistics.metrics.width',
    kind: 'number',
    descriptionKey: 'statistics.metrics.widthDescription',
  },
  height: {
    labelKey: 'statistics.metrics.height',
    kind: 'number',
    descriptionKey: 'statistics.metrics.heightDescription',
  },
  cells: {
    labelKey: 'statistics.metrics.cells',
    kind: 'number',
    descriptionKey: 'statistics.metrics.cellsDescription',
  },
  zones: {
    labelKey: 'statistics.metrics.zones',
    kind: 'number',
    descriptionKey: 'statistics.metrics.zonesDescription',
  },
  coveredCells: {
    labelKey: 'statistics.metrics.coveredCells',
    kind: 'number',
    descriptionKey: 'statistics.metrics.coveredCellsDescription',
  },
  filledCells: {
    labelKey: 'statistics.metrics.filledCells',
    kind: 'number',
    descriptionKey: 'statistics.metrics.filledCellsDescription',
  },
  coverage: {
    labelKey: 'statistics.metrics.coverage',
    kind: 'ratio',
    descriptionKey: 'statistics.metrics.coverageDescription',
  },
  regions: {
    labelKey: 'statistics.metrics.regions',
    kind: 'number',
    descriptionKey: 'statistics.metrics.regionsDescription',
  },
  overlays: {
    labelKey: 'statistics.metrics.overlays',
    kind: 'number',
    descriptionKey: 'statistics.metrics.overlaysDescription',
  },
  deformationAmplitude: {
    labelKey: 'statistics.metrics.deformationAmplitude',
    kind: 'number',
    precision: 2,
    descriptionKey: 'statistics.metrics.deformationAmplitudeDescription',
  },
  ordinary: {
    labelKey: 'statistics.metrics.ordinary',
    kind: 'number',
    descriptionKey: 'statistics.metrics.ordinaryDescription',
  },
  volcanic: {
    labelKey: 'statistics.metrics.volcanic',
    kind: 'number',
    descriptionKey: 'statistics.metrics.volcanicDescription',
  },
  lagoon: {
    labelKey: 'statistics.metrics.lagoon',
    kind: 'number',
    descriptionKey: 'statistics.metrics.lagoonDescription',
  },
  fjord: {
    labelKey: 'statistics.metrics.fjord',
    kind: 'number',
    descriptionKey: 'statistics.metrics.fjordDescription',
  },
  min: {
    labelKey: 'statistics.metrics.min',
    kind: 'number',
    precision: 1,
    descriptionKey: 'statistics.metrics.minDescription',
  },
  max: {
    labelKey: 'statistics.metrics.max',
    kind: 'number',
    precision: 1,
    descriptionKey: 'statistics.metrics.maxDescription',
  },
  mean: {
    labelKey: 'statistics.metrics.mean',
    kind: 'number',
    precision: 1,
    descriptionKey: 'statistics.metrics.meanDescription',
  },
  stdDev: {
    labelKey: 'statistics.metrics.stdDev',
    kind: 'number',
    precision: 1,
    descriptionKey: 'statistics.metrics.stdDevDescription',
  },
  moistureMin: {
    labelKey: 'statistics.metrics.moistureMin',
    kind: 'number',
    precision: 3,
    descriptionKey: 'statistics.metrics.moistureMinDescription',
  },
  moistureMax: {
    labelKey: 'statistics.metrics.moistureMax',
    kind: 'number',
    precision: 3,
    descriptionKey: 'statistics.metrics.moistureMaxDescription',
  },
  moistureMean: {
    labelKey: 'statistics.metrics.moistureMean',
    kind: 'number',
    precision: 3,
    descriptionKey: 'statistics.metrics.moistureMeanDescription',
  },
  moistureStdDev: {
    labelKey: 'statistics.metrics.moistureStdDev',
    kind: 'number',
    precision: 3,
    descriptionKey: 'statistics.metrics.moistureStdDevDescription',
  },
  landShare: {
    labelKey: 'statistics.metrics.landShare',
    kind: 'ratio',
    descriptionKey: 'statistics.metrics.landShareDescription',
  },
  coldShare: {
    labelKey: 'statistics.metrics.coldShare',
    kind: 'ratio',
    descriptionKey: 'statistics.metrics.coldShareDescription',
  },
  temperateShare: {
    labelKey: 'statistics.metrics.temperateShare',
    kind: 'ratio',
    descriptionKey: 'statistics.metrics.temperateShareDescription',
  },
  warmShare: {
    labelKey: 'statistics.metrics.warmShare',
    kind: 'ratio',
    descriptionKey: 'statistics.metrics.warmShareDescription',
  },
  bytes: {
    labelKey: 'statistics.metrics.bytes',
    kind: 'bytes',
    descriptionKey: 'statistics.metrics.bytesDescription',
  },
};

export function describeMetric(key: string): MetricDescriptorKeys | undefined {
  return METRIC_DESCRIPTORS[key];
}
