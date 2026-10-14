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
  regions: {
    label: 'Regions',
    kind: 'number',
    description: 'Number of regions the stage produced or configured.',
  },
  overlays: {
    label: 'Overlays',
    kind: 'number',
    description: 'Number of macro regions configured as overlays.',
  },
  deformationAmplitude: {
    label: 'Deformation amplitude',
    kind: 'number',
    precision: 2,
    description: 'Strength of the macro-region border displacement.',
  },
  ordinary: {
    label: 'Ordinary',
    kind: 'number',
    description: 'Regions seeded as ordinary ground.',
  },
  volcanic: {
    label: 'Volcanic',
    kind: 'number',
    description: 'Regions seeded as volcanic ground.',
  },
  lagoon: {
    label: 'Lagoon',
    kind: 'number',
    description: 'Regions seeded as lagoon ground.',
  },
  fjord: {
    label: 'Fjord',
    kind: 'number',
    description: 'Regions seeded as fjord ground.',
  },
  min: {
    label: 'Lowest height',
    kind: 'number',
    precision: 1,
    description: 'Lowest cell height in metres.',
  },
  max: {
    label: 'Highest height',
    kind: 'number',
    precision: 1,
    description: 'Highest cell height in metres.',
  },
  mean: {
    label: 'Mean height',
    kind: 'number',
    precision: 1,
    description: 'Average cell height in metres.',
  },
  stdDev: {
    label: 'Height spread',
    kind: 'number',
    precision: 1,
    description: 'Standard deviation of the cell heights, in metres.',
  },
  landShare: {
    label: 'Land share',
    kind: 'ratio',
    description: 'Share of the world above the sea level.',
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
