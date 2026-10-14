import type { GeologicalRegionType } from '../../types';

/**
 * How one region type builds its islands from stamped forms. The numbers are
 * working values to calibrate. The type carries the behaviour: the stamping
 * loop only reads these numbers and never branches on the type name.
 */
export interface RegionShape {
  /** Multiplier of the region's landShare to convert slider 0..1 into target land coverage. */
  readonly coverageFactor: number;
  /** Minimum and maximum form count at concentration = 1 (focused) and concentration = 0 (archipelago). */
  readonly minForms: number;
  readonly maxForms: number;
  /** Multiplier of the world land amplitude. */
  readonly amplitudeFactor: number;
  /** Base exponent of the radial height profile (lower = steeper dome/bluff, higher = flatter lowland with sharp peak). */
  readonly heightCurve: number;
  /** How strongly the ridge/peak may shift toward one shore to form coastal cliffs, 0..1. */
  readonly cliffShare: number;
  /** Multiplier of the domain warp around the island contour. */
  readonly warpFactor: number;
  /** How strongly the fine/medium bands texture the land interior, 0..1. */
  readonly modulationShare: number;
  /** Share of ridged noise in the interior mountain texture, 0..1. */
  readonly ridgeShare: number;
  /** Underwater shelf width as a multiple of the island radius (> 1). */
  readonly shelfFactor: number;
  /** Whether the mountainousness slider scales amplitude and per-island relief variance. */
  readonly usesMountainousness: boolean;
  /** Share of forms that carve an inner lagoon/caldera depression, 0..1. */
  readonly cavityShare: number;
  /** Relative radius of the inner cavity (lagoon or crater) as a fraction of the form radius, 0..1. */
  readonly cavityRadiusShare: number;
  /** Floor height of the cavity relative to the waterline (-1 = submerged lagoon, >0 = high crater). */
  readonly cavityFloorShare: number;
}

/** One shape recipe per region kind; the kind carries the behaviour. */
export const REGION_SHAPES: Readonly<Record<GeologicalRegionType, RegionShape>> = {
  ordinary: {
    coverageFactor: 0.42,
    minForms: 2,
    maxForms: 10,
    amplitudeFactor: 1,
    heightCurve: 1.25,
    cliffShare: 0.45,
    warpFactor: 1.15,
    modulationShare: 0.45,
    ridgeShare: 0.25,
    shelfFactor: 1.75,
    usesMountainousness: true,
    cavityShare: 0,
    cavityRadiusShare: 0,
    cavityFloorShare: 0,
  },
  volcanic: {
    coverageFactor: 0.34,
    minForms: 1,
    maxForms: 7,
    amplitudeFactor: 2.3,
    heightCurve: 1.55,
    cliffShare: 0.55,
    warpFactor: 0.65,
    modulationShare: 0.35,
    ridgeShare: 0.55,
    shelfFactor: 1.35,
    usesMountainousness: false,
    cavityShare: 0.6,
    cavityRadiusShare: 0.22,
    cavityFloorShare: 0.55,
  },
  lagoon: {
    coverageFactor: 0.24,
    minForms: 3,
    maxForms: 12,
    amplitudeFactor: 0.14,
    heightCurve: 0.85,
    cliffShare: 0.05,
    warpFactor: 0.9,
    modulationShare: 0.15,
    ridgeShare: 0,
    shelfFactor: 1.9,
    usesMountainousness: false,
    cavityShare: 0.65,
    cavityRadiusShare: 0.58,
    cavityFloorShare: -0.35,
  },
  fjord: {
    coverageFactor: 0.46,
    minForms: 2,
    maxForms: 9,
    amplitudeFactor: 1.5,
    heightCurve: 1.1,
    cliffShare: 0.75,
    warpFactor: 1.45,
    modulationShare: 0.5,
    ridgeShare: 0.6,
    shelfFactor: 1.4,
    usesMountainousness: false,
    cavityShare: 0,
    cavityRadiusShare: 0,
    cavityFloorShare: 0,
  },
};
