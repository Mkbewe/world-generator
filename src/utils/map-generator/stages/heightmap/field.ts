import type { HeightmapNoiseBands } from './bands';
import { HEIGHTMAP_BANDS, OCEAN_DEPTH_METERS } from './defaults';
import { landAmplitudeMeters } from './fields';
import type { WorldDimensions } from '../../../world-dimensions';
import { GenerationCancelledError } from '../../errors';
import { planarDistance, type WorldSpace } from '../../space';
import type { GeologicalAreaPlan, GeologyPlan, WorldPoint } from '../../types';
import {
  MAX_UPLIFT_SCALE_METERS,
  MIN_UPLIFT_SCALE_METERS,
  PROVENANCE_OUTSIDE,
} from '../geology/defaults';
import { validateGeologyPlan } from '../geology/geology-check';
import { unionHeight } from '../geology/merge';

/** Datum the whole field hangs from, in metres. */
const OCEAN_FLOOR = -OCEAN_DEPTH_METERS;

/**
 * Broad band mix at the smallest uplift scale: small forms read mostly the
 * medium band, large forms lean to the large band. The shares always sum to
 * one; the profile shifts the emphasis without breaking that invariant.
 */
const SCALE_LARGE_BASE = 0.3;
const SCALE_LARGE_SPAN = 0.55;
/** Profile lean of the broad mix: mountains favour large forms, hills medium. */
const CHARACTER_BAND_SHIFT = 0.2;

/** Fine detail: share of the local relief and the level where it fades in. */
const DETAIL_SHARE = 0.16;
const DETAIL_FADE_SHARE = 0.35;
/** Small uplifts carry more detail, large uplifts less; multiplies the share. */
const DETAIL_SCALE_HIGH = 1.3;
const DETAIL_SCALE_SPAN = 0.6;
/** Roughness scales the detail share from half (smooth) to full-plus (rough). */
const DETAIL_ROUGHNESS_BASE = 0.5;

/**
 * Fragmentation stretches the broad forms apart with a linear gain: higher
 * values lift the highs and deepen the lows, so one area breaks into more
 * separate uplifts. Linearity keeps the field smooth everywhere, including
 * the datum crossings the power curve would crease.
 */
const FRAGMENT_GAIN_SPAN = 1;

/** Density floor: even a sparse area keeps some uplift. */
const DENSITY_FLOOR = 0.35;

/** How far the area stretches across its axis at elongation 1. */
const ELONGATION_STRETCH = 2;

/** Atoll rim window and lagoon shares of the local relief. */
const RIM_START = 0.35;
const RIM_END = 0.95;
const LAGOON_SHARE = 0.45;
const LAGOON_CORE = 0.5;

/** Everything the continuous field needs; no raster inputs but the mask. */
export interface HeightFieldInput {
  readonly plan: GeologyPlan;
  readonly bands: HeightmapNoiseBands;
  readonly worldMask: Uint8Array;
  readonly dimensions: WorldDimensions;
  readonly space: WorldSpace;
  /** Global relief lean from `HeightmapConfig`, 0..1. */
  readonly relief: number;
  readonly signal?: AbortSignal;
  /** Called with 0..1 after each grid row. */
  readonly report?: (progress: number) => void;
}

/** One continuous heightfield plus the diagnostic provenance index per cell. */
export interface HeightField {
  readonly heightmap: Float32Array;
  readonly provenanceMap: Int16Array;
}

/**
 * Builds one continuous field in metres from the geology plan and the
 * heightmap's own bands. Every area contributes a signed delta with compact,
 * smooth support: its base seabed offset, an uplift potential driven by the
 * broad bands and a fine detail that fades out near the sea datum. Deltas from
 * overlapping areas merge with the single quadratic union, so the result is
 * commutative and order-independent; the deep ocean keeps the global floor
 * wherever no area reaches. Cells outside the world mask hold the `0` sentinel
 * and `PROVENANCE_OUTSIDE`.
 */
export function buildHeightField(input: HeightFieldInput): HeightField {
  const { plan, bands, worldMask, dimensions, space, relief, signal, report } = input;
  // The provenance tie-break below (first pass wins) matches `dominantAreaId`
  // (smallest id wins) only for an id-ordered plan, so enforce the invariant
  // here instead of trusting every direct caller.
  validateGeologyPlan(plan);
  const { sampleWidth, sampleHeight } = space;
  if (worldMask.length !== sampleWidth * sampleHeight) {
    throw new Error('The world mask must match the heightmap raster size.');
  }
  const heightmap = new Float32Array(sampleWidth * sampleHeight);
  const provenanceMap = new Int16Array(sampleWidth * sampleHeight).fill(PROVENANCE_OUTSIDE);
  const worldSizeMeters = Math.max(dimensions.widthMeters, dimensions.heightMeters);
  const amplitude = landAmplitudeMeters(worldSizeMeters, relief);
  // Fine detail below the sample scale is damped before sampling (plan 6.4):
  // a 150 m wave on a 250 m grid would alias into single-cell islets near the
  // sea datum, so the gate uses the shortest wave of the fine stack and closes
  // as it drops below two cells. Broad bands are never gated - large forms
  // persist across resolutions.
  const cellMeters = Math.max(
    dimensions.widthMeters / sampleWidth,
    dimensions.heightMeters / sampleHeight
  );
  const fineBand = HEIGHTMAP_BANDS.fine;
  const shortestFineWaveMeters = fineBand.wavelengthMeters / 2 ** (fineBand.octaves - 1);
  const fineGate = Math.min(1, shortestFineWaveMeters / (2 * cellMeters));
  const passes = plan.areas.map((area, index) =>
    createPass(area, index, amplitude, space, DETAIL_SHARE * fineGate, worldSizeMeters)
  );
  const lift = new Float64Array(sampleWidth);
  const drop = new Float64Array(sampleWidth);
  const bestStrength = new Float32Array(sampleWidth);
  const bestIndex = new Int16Array(sampleWidth);

  for (let y = 0; y < sampleHeight; y++) {
    if (signal?.aborted) {
      throw new GenerationCancelledError();
    }
    lift.fill(0);
    drop.fill(0);
    bestStrength.fill(-1);
    bestIndex.fill(PROVENANCE_OUTSIDE);

    for (const pass of passes) {
      if (y < pass.fromY || y > pass.toY) {
        continue;
      }
      for (let x = pass.fromX; x <= pass.toX; x++) {
        const index = y * sampleWidth + x;
        if (worldMask[index] === 0) {
          continue;
        }
        const delta = areaDelta(pass, space.cellToNormalized(x, y), bands);
        if (delta === 0) {
          continue;
        }
        if (delta > 0) {
          lift[x] += delta * delta;
        } else {
          drop[x] += delta * delta;
        }
        const strength = Math.abs(delta);
        if (strength > bestStrength[x]) {
          bestStrength[x] = strength;
          bestIndex[x] = pass.index;
        }
      }
    }

    for (let x = 0; x < sampleWidth; x++) {
      const index = y * sampleWidth + x;
      if (worldMask[index] === 0) {
        heightmap[index] = 0;
        provenanceMap[index] = PROVENANCE_OUTSIDE;
        continue;
      }
      heightmap[index] = Math.fround(OCEAN_FLOOR + unionHeight(lift[x], drop[x]));
      provenanceMap[index] = bestIndex[x];
    }
    report?.((y + 1) / sampleHeight);
  }

  return { heightmap, provenanceMap };
}

/** One area precomputed for the raster loop: frame, bounds and typical relief. */
interface AreaPass {
  readonly area: GeologicalAreaPlan;
  readonly index: number;
  readonly fromX: number;
  readonly toX: number;
  readonly fromY: number;
  readonly toY: number;
  readonly cos: number;
  readonly sin: number;
  readonly acrossScale: number;
  readonly reliefHeight: number;
  /**
   * Influence radius in normalized units: the extent plus the shelf apron in
   * world share. Equals the extent when the area leaves no shelf, so its
   * weight stays bit-identical to the shelf-less one.
   */
  readonly supportExtent: number;
  /** Support extent in the area's own radius scale; equals 1 without a shelf. */
  readonly reach: number;
  /** Broad band shares; always sum to one. */
  readonly largeShare: number;
  readonly mediumShare: number;
  /** Contrast gain of the broad forms; 1 leaves them untouched. */
  readonly fragmentGain: number;
  /** Share of the local relief carried by fine detail, after sample gating. */
  readonly detailShare: number;
}

function createPass(
  area: GeologicalAreaPlan,
  index: number,
  amplitude: number,
  space: WorldSpace,
  detailBase: number,
  worldSizeMeters: number
): AreaPass {
  const supportExtent = area.extent + area.shelfWidthMeters / worldSizeMeters;
  const from = space.normalizedToCell(area.centre.x - supportExtent, area.centre.y - supportExtent);
  const to = space.normalizedToCell(area.centre.x + supportExtent, area.centre.y + supportExtent);
  const density = DENSITY_FLOOR + (1 - DENSITY_FLOOR) * area.upliftDensity;
  const scaleT =
    (area.upliftScaleMeters - MIN_UPLIFT_SCALE_METERS) /
    (MAX_UPLIFT_SCALE_METERS - MIN_UPLIFT_SCALE_METERS);
  const largeShare = Math.min(
    1,
    Math.max(
      0,
      SCALE_LARGE_BASE +
        SCALE_LARGE_SPAN * scaleT +
        CHARACTER_BAND_SHIFT * (area.profile.mountainStrength - area.profile.hillStrength)
    )
  );

  return {
    area,
    index,
    fromX: Math.max(0, Math.min(from.x, to.x) - 1),
    toX: Math.min(space.sampleWidth - 1, Math.max(from.x, to.x) + 1),
    fromY: Math.max(0, Math.min(from.y, to.y) - 1),
    toY: Math.min(space.sampleHeight - 1, Math.max(from.y, to.y) + 1),
    cos: Math.cos(area.direction),
    sin: Math.sin(area.direction),
    acrossScale: 1 + ELONGATION_STRETCH * area.elongation,
    reliefHeight: amplitude * area.profile.elevation * density,
    supportExtent,
    reach: supportExtent / area.extent,
    largeShare,
    mediumShare: 1 - largeShare,
    fragmentGain: 1 + FRAGMENT_GAIN_SPAN * area.fragmentation,
    detailShare:
      detailBase *
      (DETAIL_SCALE_HIGH - DETAIL_SCALE_SPAN * scaleT) *
      (DETAIL_ROUGHNESS_BASE + area.profile.roughness),
  };
}

/** Signed delta of one area at a point, in metres; zero outside its support. */
function areaDelta(pass: AreaPass, point: WorldPoint, bands: HeightmapNoiseBands): number {
  const radius = areaRadius(pass, point);
  // The shelf stretches the fade to the support edge; with no shelf the reach
  // is exactly 1 and the weight below is the historical one.
  if (radius >= pass.reach) {
    return 0;
  }
  const weight = smoothstep(1 - radius / pass.reach);
  const broad =
    (bands.large(point) * pass.largeShare + bands.medium(point) * pass.mediumShare) *
    pass.fragmentGain;
  const lowFrequency =
    pass.area.seabedOffsetMeters +
    pass.reliefHeight * (broad * 0.5 + 0.5) +
    rimHeight(pass, radius);
  const fade = Math.max(1, pass.reliefHeight * DETAIL_FADE_SHARE);
  const detail =
    bands.fine(point) *
    pass.reliefHeight *
    pass.detailShare *
    smoothstep(Math.abs(lowFrequency) / fade);

  return (lowFrequency + detail) * weight;
}

/**
 * Normalized distance from the area centre, 1 at the area edge. Features
 * (rim, relief) always read this scale; the shelf only stretches the fade
 * beyond it, up to the support edge.
 */
function areaRadius(pass: AreaPass, point: WorldPoint): number {
  const dx = point.x - pass.area.centre.x;
  const dy = point.y - pass.area.centre.y;
  const along = dx * pass.cos + dy * pass.sin;
  const across = (-dx * pass.sin + dy * pass.cos) * pass.acrossScale;
  return planarDistance({ x: along, y: across }, { x: 0, y: 0 }) / pass.area.extent;
}

/** Radial atoll tendency: a shallow rim with a lower lagoon in the centre. */
function rimHeight(pass: AreaPass, radius: number): number {
  if (pass.area.rimStrength <= 0) {
    return 0;
  }
  const lagoon = 1 - smoothstep(radius / LAGOON_CORE);
  return pass.area.rimStrength * pass.reliefHeight * (rimBump(radius) - LAGOON_SHARE * lagoon);
}

function rimBump(radius: number): number {
  if (radius <= RIM_START || radius >= RIM_END) {
    return 0;
  }
  // A smoothstep window peaks at 1 like the old sine and keeps a zero slope on
  // both window edges, so the rim adds no crease to the field.
  const t = (radius - RIM_START) / (RIM_END - RIM_START);
  return 4 * smoothstep(t) * smoothstep(1 - t);
}

/** Smooth C1 ramp from 0 to 1 over the unit interval. */
function smoothstep(value: number): number {
  const at = Math.min(1, Math.max(0, value));
  return at * at * (3 - 2 * at);
}
