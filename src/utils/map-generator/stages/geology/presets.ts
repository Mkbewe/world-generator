import { MAX_AREA_EXTENT, MAX_GEOLOGICAL_AREAS, MIN_AREA_EXTENT } from './defaults';
import type { WorldDimensions } from '../../../world-dimensions';
import type { WorldShape } from '../../../world-shape';
import { RandomFactory } from '../../random';
import type {
  GeologicalAreaConfig,
  GeologicalAreaPlacement,
  GeologicalCharacter,
  GeologyConfig,
  TerrainCharacter,
} from '../../types';

/** Named parameter sets that seed one area; presets are values, not algorithms. */
export type GeologicalAreaPresetId = 'shallow-archipelago' | 'volcanic' | 'atoll';

/** Character each starter set builds; the form picks its card controls with it. */
export const AREA_CHARACTERS: Readonly<Record<GeologicalAreaPresetId, GeologicalCharacter>> = {
  'shallow-archipelago': 'ordinary',
  volcanic: 'volcanic',
  atoll: 'atoll',
};

/**
 * The numbers a preset provides. Id, placement, direction and character stay
 * per entry, so the same preset can seed several areas of one list.
 */
export type GeologicalAreaPreset = Readonly<
  Omit<GeologicalAreaConfig, 'id' | 'placement' | 'direction' | 'character'>
>;

/**
 * Starter values for an ordinary, volcanic and atoll-capable area. They differ
 * in seabed, uplift distribution and local reef tendency — data the field
 * sampler reads without branching on a preset name in the raster loop.
 */
export const GEOLOGICAL_AREA_PRESETS: Readonly<
  Record<GeologicalAreaPresetId, GeologicalAreaPreset>
> = {
  'shallow-archipelago': {
    extent: 0.18,
    elongation: 0.35,
    upliftDensity: 0.55,
    upliftScaleMeters: 600,
    fragmentation: 0.65,
    seabedOffsetMeters: 40,
    shelfWidthMeters: 800,
    rimStrength: 0,
    relief: 'plains',
  },
  volcanic: {
    extent: 0.12,
    elongation: 0.2,
    upliftDensity: 0.65,
    upliftScaleMeters: 900,
    fragmentation: 0.2,
    seabedOffsetMeters: -20,
    shelfWidthMeters: 0,
    rimStrength: 0,
    relief: 'mountains',
  },
  atoll: {
    extent: 0.16,
    elongation: 0.15,
    upliftDensity: 0.4,
    upliftScaleMeters: 450,
    fragmentation: 0.35,
    seabedOffsetMeters: 20,
    shelfWidthMeters: 400,
    rimStrength: 0.85,
    relief: 'plains',
  },
};

/**
 * Per-field defaults for a fresh entry; the presets above are named
 * configurations of the same fields. Units match `GeologicalAreaConfig`.
 */
export const DEFAULT_GEOLOGICAL_AREA_VALUES: GeologicalAreaPreset = {
  extent: 0.18,
  elongation: 0.25,
  upliftDensity: 0.45,
  upliftScaleMeters: 600,
  fragmentation: 0.4,
  seabedOffsetMeters: 0,
  shelfWidthMeters: 400,
  rimStrength: 0,
  relief: 'plains',
};

/** Normalizes a heading to the contract range [0, 2π). */
export function normalizeDirection(radians: number): number {
  const turn = Math.PI * 2;
  return ((radians % turn) + turn) % turn;
}

/** Builds one area from a preset; the caller owns the id and the placement. */
export function createGeologicalArea(
  id: string,
  preset: GeologicalAreaPresetId,
  placement: GeologicalAreaPlacement = { kind: 'automatic' },
  direction = 0
): GeologicalAreaConfig {
  return {
    id,
    character: AREA_CHARACTERS[preset],
    placement,
    direction: normalizeDirection(direction),
    ...GEOLOGICAL_AREA_PRESETS[preset],
  };
}

/**
 * Geography recipes create whole area lists. The world preset may choose a
 * recipe when a new configuration is created; the sampler sees only areas.
 */
export const GEOGRAPHY_PRESET_IDS = [
  'random',
  'archipelago',
  'volcanic-islands',
  'lagoons-atolls',
] as const;
export type GeographyPresetId = (typeof GEOGRAPHY_PRESET_IDS)[number];

export function isGeographyPresetId(value: string): value is GeographyPresetId {
  return GEOGRAPHY_PRESET_IDS.some(id => id === value);
}

/** Physical area per geological zone before the world-shape area is applied. */
const TARGET_ZONE_AREA_METERS2 = 1_800_000;
/** Total influence-disk area relative to the world; overlap is expected. */
const TARGET_COVERAGE = 0.7;
const CHARACTER_WEIGHTS: Readonly<
  Record<
    GeographyPresetId,
    readonly { readonly character: GeologicalAreaPresetId; readonly weight: number }[]
  >
> = {
  random: [
    { character: 'shallow-archipelago', weight: 0.55 },
    { character: 'volcanic', weight: 0.25 },
    { character: 'atoll', weight: 0.2 },
  ],
  archipelago: [{ character: 'shallow-archipelago', weight: 1 }],
  'volcanic-islands': [
    { character: 'volcanic', weight: 0.8 },
    { character: 'shallow-archipelago', weight: 0.2 },
  ],
  'lagoons-atolls': [
    { character: 'atoll', weight: 0.8 },
    { character: 'shallow-archipelago', weight: 0.2 },
  ],
};
const RELIEF_WEIGHTS: Readonly<
  Record<
    GeologicalAreaPresetId,
    readonly { readonly character: TerrainCharacter; readonly weight: number }[]
  >
> = {
  'shallow-archipelago': [
    { character: 'plains', weight: 0.65 },
    { character: 'hills', weight: 0.28 },
    { character: 'mountains', weight: 0.07 },
  ],
  volcanic: [{ character: 'mountains', weight: 1 }],
  atoll: [{ character: 'plains', weight: 1 }],
};

/** One seeded recipe resolves to the same editable area list used by manual edits. */
export function createGeographyPreset(
  preset: GeographyPresetId,
  seed: number,
  dimensions: WorldDimensions,
  shape: WorldShape
): GeologyConfig {
  const stream = new RandomFactory(seed).create(`geology.geography.${preset}`);
  const shapeShare = shape === 'disc' ? Math.PI / 4 : 1;
  const worldArea = dimensions.widthMeters * dimensions.heightMeters * shapeShare;
  const variation = 0.85 + stream.next() * 0.3;
  const count = Math.max(
    1,
    Math.min(MAX_GEOLOGICAL_AREAS, Math.round((worldArea / TARGET_ZONE_AREA_METERS2) * variation))
  );
  const radiusMeters = Math.sqrt((worldArea * TARGET_COVERAGE) / (count * Math.PI));
  const worldSizeMeters = Math.max(dimensions.widthMeters, dimensions.heightMeters);
  const areas = Array.from({ length: count }, (_entry, index) => {
    const character =
      index === 0
        ? CHARACTER_WEIGHTS[preset][0].character
        : pickWeighted(CHARACTER_WEIGHTS[preset], stream.next());
    const extent = Math.max(
      MIN_AREA_EXTENT,
      Math.min(MAX_AREA_EXTENT, (radiusMeters / worldSizeMeters) * (0.75 + stream.next() * 0.5))
    );
    const area = createGeologicalArea(`area-${index + 1}`, character);
    return {
      ...area,
      extent,
      relief: pickWeighted(RELIEF_WEIGHTS[character], stream.next()),
      direction: normalizeDirection(stream.next() * Math.PI * 2),
      upliftDensity: Math.min(1, Math.max(0, area.upliftDensity + (stream.next() - 0.5) * 0.2)),
      fragmentation: Math.min(1, Math.max(0, area.fragmentation + (stream.next() - 0.5) * 0.2)),
    };
  });
  return { areas };
}

function pickWeighted<T>(
  weights: readonly { readonly character: T; readonly weight: number }[],
  roll: number
): T {
  let boundary = 0;
  for (const entry of weights) {
    boundary += entry.weight;
    if (roll < boundary) {
      return entry.character;
    }
  }
  const last = weights.at(-1);
  if (!last) {
    throw new Error('A geography preset needs at least one area character.');
  }
  return last.character;
}

/** The entry a fresh configuration starts from. */
export const DEFAULT_GEOLOGICAL_AREA: GeologicalAreaConfig = {
  id: 'area-1',
  character: 'ordinary',
  placement: { kind: 'automatic' },
  direction: 0,
  ...DEFAULT_GEOLOGICAL_AREA_VALUES,
};

/** Contract values a fresh configuration starts from. */
export const DEFAULT_GEOLOGY_CONFIG: GeologyConfig = { areas: [DEFAULT_GEOLOGICAL_AREA] };
