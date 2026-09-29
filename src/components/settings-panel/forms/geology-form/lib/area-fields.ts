import {
  MAX_AREA_EXTENT,
  MAX_UPLIFT_SCALE_METERS,
  MIN_AREA_EXTENT,
  MIN_UPLIFT_SCALE_METERS,
} from '../../../../../utils/map-generator/stages/geology';
import type {
  GeologicalAreaConfig,
  GeologicalCharacter,
} from '../../../../../utils/map-generator/types';

export const percent = (value: number): string => `${Math.round(value * 100)}%`;

export const CHARACTER_LABELS: Readonly<Record<GeologicalCharacter, string>> = {
  ordinary: 'Ordinary',
  volcanic: 'Volcanic',
  atoll: 'Atoll',
};

/** Accent of each character, shared by the swatch and the preview. */
export const CHARACTER_COLORS: Readonly<
  Record<GeologicalCharacter, readonly [number, number, number]>
> = {
  ordinary: [110, 168, 92],
  volcanic: [196, 88, 72],
  atoll: [72, 158, 170],
};

/** One main control of a card; the character picks the short list. */
export interface AreaControl {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly value: number;
  readonly min: number;
  readonly max: number;
  readonly step: number;
  readonly format: (value: number) => string;
  readonly rangeLabels?: readonly [minimum: string, maximum: string];
  readonly onChange: (value: number) => void;
}

const SIZE_RANGE = {
  min: MIN_AREA_EXTENT,
  max: MAX_AREA_EXTENT,
  step: 0.01,
  format: percent,
} as const;

/** The few controls each character exposes; technical fields stay hidden. */
export function areaControls(
  area: GeologicalAreaConfig,
  onChange: (patch: Partial<GeologicalAreaConfig>) => void
): readonly AreaControl[] {
  const size: AreaControl = {
    id: 'size',
    label: 'Size',
    description:
      'How far the area reaches; the field fades out before this edge. A bigger area does not mean bigger islands.',
    value: area.extent,
    ...SIZE_RANGE,
    rangeLabels: ['Small', 'Large'],
    onChange: extent => onChange({ extent }),
  };
  return [size, ...characterControls(area, onChange)];
}

function characterControls(
  area: GeologicalAreaConfig,
  onChange: (patch: Partial<GeologicalAreaConfig>) => void
): readonly AreaControl[] {
  const controls: Record<GeologicalCharacter, readonly AreaControl[]> = {
    ordinary: [
      {
        id: 'density',
        label: 'Cluster density',
        description: 'How much of the area tends to rise into separate clusters.',
        value: area.upliftDensity,
        min: 0,
        max: 1,
        step: 0.05,
        format: percent,
        rangeLabels: ['Sparse', 'Dense'],
        onChange: upliftDensity => onChange({ upliftDensity }),
      },
      {
        id: 'spread',
        label: 'Form spread',
        description: 'Higher values break one land into more separate forms.',
        value: area.fragmentation,
        min: 0,
        max: 1,
        step: 0.05,
        format: percent,
        rangeLabels: ['Whole', 'Broken'],
        onChange: fragmentation => onChange({ fragmentation }),
      },
    ],
    volcanic: [
      {
        id: 'density',
        label: 'Uplift density',
        description: 'How much of the area tends to rise; volcanic ground is steeper.',
        value: area.upliftDensity,
        min: 0,
        max: 1,
        step: 0.05,
        format: percent,
        rangeLabels: ['Sparse', 'Dense'],
        onChange: upliftDensity => onChange({ upliftDensity }),
      },
      {
        id: 'height',
        label: 'Terrain height',
        description: 'Typical height of the ground: plains stay low, mountains rise high.',
        value: terrainHeightValue(area),
        min: 0,
        max: 2,
        step: 1,
        format: value => TERRAIN_HEIGHTS[value] ?? 'Plains',
        rangeLabels: ['Plains', 'Mountains'],
        onChange: value => {
          const relief = TERRAIN_HEIGHTS[value];
          if (relief) {
            onChange({ relief });
          }
        },
      },
    ],
    atoll: [
      {
        id: 'density',
        label: 'Atoll density',
        description: 'More density packs more local reefs and lagoons into the area.',
        value: atollDensity(area.upliftScaleMeters),
        min: 0,
        max: 1,
        step: 0.05,
        format: percent,
        rangeLabels: ['Few', 'Many'],
        onChange: density => onChange({ upliftScaleMeters: atollScale(density) }),
      },
      {
        id: 'rim',
        label: 'Lagoon rim',
        description: 'Builds shallow reef rims around sunken lagoons.',
        value: area.rimStrength,
        min: 0,
        max: 1,
        step: 0.05,
        format: percent,
        rangeLabels: ['None', 'Strong'],
        onChange: rimStrength => onChange({ rimStrength }),
      },
    ],
  };
  return controls[area.character];
}

const TERRAIN_HEIGHTS: Readonly<Record<number, GeologicalAreaConfig['relief'] | undefined>> = {
  0: 'plains',
  1: 'hills',
  2: 'mountains',
};

function terrainHeightValue(area: GeologicalAreaConfig): number {
  if (area.relief === 'mountains') {
    return 2;
  }
  if (area.relief === 'hills') {
    return 1;
  }
  return 0;
}

/** Density 0..1 read back from the uplift scale metres the field consumes. */
function atollDensity(upliftScaleMeters: number): number {
  return (
    (MAX_UPLIFT_SCALE_METERS - upliftScaleMeters) /
    (MAX_UPLIFT_SCALE_METERS - MIN_UPLIFT_SCALE_METERS)
  );
}

function atollScale(density: number): number {
  return MAX_UPLIFT_SCALE_METERS - density * (MAX_UPLIFT_SCALE_METERS - MIN_UPLIFT_SCALE_METERS);
}
