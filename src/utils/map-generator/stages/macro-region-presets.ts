import type { MacroRegionConfig } from '../types';

export type MacroRegionLayout = 'radial' | 'horizontal' | 'vertical';
export type MacroRegionPresetId = 'rings' | 'horizontal' | 'vertical' | 'rings-with-poles';

export interface MacroRegionPresetDefinition {
  readonly id: MacroRegionPresetId;
  readonly label: string;
  readonly description: string;
  readonly layout: MacroRegionLayout;
  readonly createRegions: () => readonly MacroRegionConfig[];
}

const RADIAL_EXTENT = 0.5;

/** Concentric base regions ordered from the centre to the rim. */
export function createRadialLayout(count = 4): MacroRegionConfig[] {
  const zones = positiveCount(count);

  return Array.from({ length: zones }, (_, index) => ({
    id: `radial-${index + 1}`,
    label: `Region ${index + 1}`,
    role: 'base',
    geometry: {
      kind: 'ring',
      center: { x: 0.5, y: 0.5 },
      innerRadius: (index / zones) * RADIAL_EXTENT,
      outerRadius: ((index + 1) / zones) * RADIAL_EXTENT,
    },
    danger: zones === 1 ? 0 : index / (zones - 1),
  }));
}

/** Horizontal base regions ordered north to south. */
export function createHorizontalLayout(count = 4): MacroRegionConfig[] {
  return createBands('y', count);
}

/** Vertical base regions ordered west to east. */
export function createVerticalLayout(count = 4): MacroRegionConfig[] {
  return createBands('x', count);
}

export function createMacroRegionLayout(
  layout: MacroRegionLayout,
  count?: number
): MacroRegionConfig[] {
  switch (layout) {
    case 'horizontal':
      return createHorizontalLayout(count);
    case 'vertical':
      return createVerticalLayout(count);
    default:
      return createRadialLayout(count);
  }
}

export function createBandOverlay(
  id: string,
  label: string,
  axis: 'x' | 'y',
  center = 0.5,
  width = 0.2,
  danger = 1
): MacroRegionConfig {
  return {
    id,
    label,
    role: 'overlay',
    geometry: { kind: 'band', axis, center, width },
    danger,
  };
}

/** Example composition implemented with the same overlays exposed by the form. */
export function createRadialPolesLayout(count = 6): MacroRegionConfig[] {
  const rings = createRadialLayout(Math.max(1, count - 2));
  return [
    ...rings,
    createBandOverlay('pole-north', `Region ${rings.length + 1}`, 'y', 0, 0.32),
    createBandOverlay('pole-south', `Region ${rings.length + 2}`, 'y', 1, 0.32),
  ];
}

export const MACRO_REGION_PRESETS: readonly MacroRegionPresetDefinition[] = [
  {
    id: 'rings',
    label: 'Rings',
    description: 'Four concentric regions with danger increasing towards the rim.',
    layout: 'radial',
    createRegions: () => createRadialLayout(4),
  },
  {
    id: 'horizontal',
    label: 'Horizontal',
    description: 'Five horizontal regions with a safer middle and dangerous edges.',
    layout: 'horizontal',
    createRegions: () => createHorizontalLayout(5),
  },
  {
    id: 'vertical',
    label: 'Vertical',
    description: 'Five vertical regions with a safer middle and dangerous edges.',
    layout: 'vertical',
    createRegions: () => createVerticalLayout(5),
  },
  {
    id: 'rings-with-poles',
    label: 'Rings + poles',
    description: 'Four concentric regions crossed by dangerous bands at both poles.',
    layout: 'radial',
    createRegions: () => createRadialPolesLayout(6),
  },
];

export function macroRegionPreset(id: MacroRegionPresetId): MacroRegionPresetDefinition {
  const preset = MACRO_REGION_PRESETS.find(item => item.id === id);
  if (!preset) {
    throw new RangeError(`Unknown macro region preset: "${id}".`);
  }
  return preset;
}

function createBands(axis: 'x' | 'y', count: number): MacroRegionConfig[] {
  const zones = positiveCount(count);
  const width = 1 / zones;
  const middle = (zones - 1) / 2;
  const maximumDistance = Math.max(middle, 1);

  return Array.from({ length: zones }, (_, index) => ({
    id: `${axis}-${index + 1}`,
    label: `Region ${index + 1}`,
    role: 'base',
    geometry: {
      kind: 'band',
      axis,
      center: (index + 0.5) / zones,
      width,
    },
    danger: Math.abs(index - middle) / maximumDistance,
  }));
}

function positiveCount(count: number | undefined): number {
  return Math.max(1, Math.floor(count ?? 1));
}
