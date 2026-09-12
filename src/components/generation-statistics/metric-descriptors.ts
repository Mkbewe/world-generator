import type { MetricDescriptor } from '../../utils/format';

export const METRIC_DESCRIPTORS: Record<string, MetricDescriptor> = {
  shape: {
    label: 'Shape',
    kind: 'text',
    description: 'World shape preset used to build the mask (disc or rectangle).',
  },
  width: { label: 'Width', kind: 'number', description: 'Grid width in cells.' },
  height: { label: 'Height', kind: 'number', description: 'Grid height in cells.' },
  cells: { label: 'Cells', kind: 'number', description: 'Total number of cells (width × height).' },
  filledCells: {
    label: 'Filled cells',
    kind: 'number',
    description: 'Cells that lie inside the world shape.',
  },
  coverage: {
    label: 'Coverage',
    kind: 'ratio',
    description: 'Share of the grid that lies inside the world shape.',
  },
  frequency: {
    label: 'Frequency',
    kind: 'number',
    precision: 2,
    description: 'Base noise frequency — how many cycles fit across the world.',
  },
  octaves: {
    label: 'Octaves',
    kind: 'number',
    description: 'Number of noise layers summed together for detail.',
  },
  persistence: {
    label: 'Persistence',
    kind: 'number',
    precision: 2,
    description: 'How much each octave contributes relative to the previous one.',
  },
  lacunarity: {
    label: 'Lacunarity',
    kind: 'number',
    precision: 2,
    description: 'Frequency multiplier between consecutive octaves.',
  },
  samples: {
    label: 'Samples',
    kind: 'number',
    description: 'Number of cells the noise statistics were computed over.',
  },
  min: { label: 'Min', kind: 'number', precision: 3, description: 'Lowest noise value.' },
  max: { label: 'Max', kind: 'number', precision: 3, description: 'Highest noise value.' },
  mean: { label: 'Mean', kind: 'number', precision: 3, description: 'Average noise value.' },
  stdDev: {
    label: 'Std dev',
    kind: 'number',
    precision: 3,
    description: 'Standard deviation — how spread out the noise values are.',
  },
  bytes: {
    label: 'Data',
    kind: 'bytes',
    description: 'Size of the layer data produced by this stage.',
  },
};

export function describeMetric(key: string): MetricDescriptor {
  return METRIC_DESCRIPTORS[key] ?? { label: key, kind: 'number', description: '', precision: 3 };
}
