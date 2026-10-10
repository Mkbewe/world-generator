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
  atoll: {
    label: 'Atoll',
    kind: 'number',
    description: 'Regions seeded as atoll ground.',
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
