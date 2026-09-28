import type { GeologicalAreaConfig, GeologicalAreaPlacement, GeologyConfig } from '../../types';

/** Named parameter sets that seed one area; presets are values, not algorithms. */
export type GeologicalAreaPresetId = 'shallow-archipelago' | 'volcanic' | 'atoll';

/**
 * The numbers a preset provides. Id, placement and direction stay per entry,
 * so the same preset can seed several areas of one list.
 */
export type GeologicalAreaPreset = Readonly<
  Omit<GeologicalAreaConfig, 'id' | 'placement' | 'direction'>
>;

/**
 * The three example presets from the plan: a shallow archipelago, a volcanic
 * area and an atoll. They differ in seabed, uplift distribution and rim
 * tendency — data the field sampler reads, never a branch in the raster loop.
 */
export const GEOLOGICAL_AREA_PRESETS: Readonly<
  Record<GeologicalAreaPresetId, GeologicalAreaPreset>
> = {
  'shallow-archipelago': {
    extent: 0.24,
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
    upliftDensity: 0.3,
    upliftScaleMeters: 900,
    fragmentation: 0.2,
    seabedOffsetMeters: -300,
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
    seabedOffsetMeters: -60,
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
  extent: 0.2,
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
    placement,
    direction: normalizeDirection(direction),
    ...GEOLOGICAL_AREA_PRESETS[preset],
  };
}

/** The entry a fresh configuration starts from. */
export const DEFAULT_GEOLOGICAL_AREA: GeologicalAreaConfig = {
  id: 'area-1',
  placement: { kind: 'automatic' },
  direction: 0,
  ...DEFAULT_GEOLOGICAL_AREA_VALUES,
};

/** Contract values a fresh configuration starts from. */
export const DEFAULT_GEOLOGY_CONFIG: GeologyConfig = { areas: [DEFAULT_GEOLOGICAL_AREA] };
