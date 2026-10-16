import type { GeologicalRegionType } from '../../../types';

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
  /** How strongly the summit shore narrows into a steep coastal cliff, 0..1. */
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
  /**
   * Floor height of the cavity: >= 0 carves a crater around `form.peak` at
   * `peakMeters * cavityFloorShare`; < 0 builds a reef ring around `form.centre`
   * with a submerged lagoon floor at `SHELF_DEPTH_METERS * cavityFloorShare`.
   */
  readonly cavityFloorShare: number;
  /** Angular frequency of radial coastal channels (fjords); 0 disables channels. */
  readonly chuteCount: number;
  /** How deeply the coastal channels cut into the island margin, 0..1. */
  readonly chuteStrength: number;
  /** Ocean floor depth multiplier of the region, 1 is the shared deep ocean. */
  readonly oceanFloorShare: number;
}

/** One shape recipe per region kind; the kind carries the behaviour. */
export const REGION_SHAPES: Readonly<Record<GeologicalRegionType, RegionShape>> = {
  ordinary: {
    coverageFactor: 0.11,
    minForms: 2,
    maxForms: 10,
    amplitudeFactor: 0.9,
    heightCurve: 1.2,
    cliffShare: 0.5,
    warpFactor: 1.5,
    modulationShare: 0.45,
    ridgeShare: 0.3,
    shelfFactor: 1.75,
    usesMountainousness: true,
    cavityShare: 0,
    cavityRadiusShare: 0,
    cavityFloorShare: 0,
    chuteCount: 0,
    chuteStrength: 0,
    oceanFloorShare: 1,
  },
  volcanic: {
    coverageFactor: 0.09,
    minForms: 1,
    maxForms: 7,
    amplitudeFactor: 1.8,
    heightCurve: 1.45,
    cliffShare: 0.55,
    warpFactor: 0.85,
    modulationShare: 0.35,
    ridgeShare: 0.55,
    shelfFactor: 1.35,
    usesMountainousness: false,
    cavityShare: 0.85,
    cavityRadiusShare: 0.32,
    cavityFloorShare: 0.12,
    chuteCount: 0,
    chuteStrength: 0,
    oceanFloorShare: 1.1,
  },
  lagoon: {
    coverageFactor: 0.09,
    minForms: 3,
    maxForms: 11,
    amplitudeFactor: 0.018,
    heightCurve: 0.75,
    cliffShare: 0.05,
    warpFactor: 0.5,
    modulationShare: 0.15,
    ridgeShare: 0,
    shelfFactor: 2.35,
    usesMountainousness: false,
    cavityShare: 0.8,
    cavityRadiusShare: 0.74,
    cavityFloorShare: -0.06,
    chuteCount: 0,
    chuteStrength: 0,
    oceanFloorShare: 0.28,
  },
  fjord: {
    coverageFactor: 0.12,
    minForms: 2,
    maxForms: 8,
    amplitudeFactor: 1.35,
    heightCurve: 0.85,
    cliffShare: 0.5,
    warpFactor: 1.6,
    modulationShare: 0.5,
    ridgeShare: 0.65,
    shelfFactor: 1.35,
    usesMountainousness: false,
    cavityShare: 0,
    cavityRadiusShare: 0,
    cavityFloorShare: 0,
    chuteCount: 4,
    chuteStrength: 0.9,
    oceanFloorShare: 1,
  },
};
