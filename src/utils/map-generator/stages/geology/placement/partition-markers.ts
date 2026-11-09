import { GenerationCancelledError } from '@generator/errors';
import type { RandomFactory } from '@generator/random';
import type { SeededRandom } from '@generator/random/seeded-random';
import type { WorldSpace } from '@generator/space';
import type {
  GeologicalRegionConfig,
  GeologicalRegionType,
  HeatZoneClass,
  WorldPoint,
} from '@generator/types';

import { clamp01 } from '../../../../math';
import type { WorldDimensions } from '../../../../world-dimensions';
import { containsNormalized, type WorldShape } from '../../../../world-shape';

/** Seed-resolved marker of one region; the input of the region partition. */
export interface RegionMarker {
  readonly id: string;
  readonly type: GeologicalRegionType;
  readonly centre: WorldPoint;
  readonly weight: number;
}

export interface MarkerPlacementInput {
  readonly regions: readonly GeologicalRegionConfig[];
  readonly evenness: number;
  readonly dimensions: WorldDimensions;
  readonly shape: WorldShape;
  readonly space: WorldSpace;
  readonly random: RandomFactory;
  /** Thermal class at a normalized point; enables the light anchor preference. */
  readonly thermalAt: (point: WorldPoint) => HeatZoneClass;
  /** How strongly the anchor preference applies, 0..1. */
  readonly geologyCoupling: number;
  readonly signal?: AbortSignal;
  readonly report?: (progress: number) => void;
}

/** Soft preference of a region type for a thermal class; never a filter. */
const THERMAL_ANCHOR_PREFERENCE: Readonly<Partial<Record<GeologicalRegionType, HeatZoneClass>>> = {
  lagoon: 'warm',
  fjord: 'cold',
};
/** A light bonus, so only close candidates change order. */
const THERMAL_ANCHOR_BIAS_SHARE = 0.02;
/** A matching candidate may move the anchor by at most this share of spacing. */
const THERMAL_ANCHOR_MAX_SHIFT_SHARE = 0.01;

/** Candidate pool at zero evenness; still compares more than one position. */
const MIN_CANDIDATES = 2;
/** Candidate pool at full evenness. */
const MAX_CANDIDATES = 32;
/** Seeded probes spent on one marker before its placement is rejected. */
const MARKER_ATTEMPTS = 256;
/** Clearance floor at zero evenness, as a share of the even marker spacing. */
const MIN_SEPARATION_SHARE_CLUSTERED = 0.15;
/** Clearance floor at full evenness, as a share of the even marker spacing. */
const MIN_SEPARATION_SHARE_EVEN = 0.45;

/** Fixed anchor of the first region, in normalized world coordinates. */
const WORLD_CENTRE: WorldPoint = { x: 0.5, y: 0.5 };

/**
 * Best-candidate marker placement: the first region always sits at the world
 * centre, every other region draws a pool of valid points from its own named
 * stream and keeps the one farthest from the markers placed so far. Evenness
 * raises both the pool size and the required clearance, so at zero the anchors
 * may bunch up while at full it enforces a visibly spread layout; a layout the
 * world cannot hold is rejected instead of being nudged into place.
 */
export function placePartitionMarkers(input: MarkerPlacementInput): RegionMarker[] {
  const count = input.regions.length;
  const idealSpacing = Math.sqrt(
    (input.dimensions.widthMeters * input.dimensions.heightMeters) / count
  );
  const minSeparation =
    idealSpacing *
    (MIN_SEPARATION_SHARE_CLUSTERED +
      input.evenness * (MIN_SEPARATION_SHARE_EVEN - MIN_SEPARATION_SHARE_CLUSTERED));
  const candidates =
    MIN_CANDIDATES + Math.round(input.evenness * (MAX_CANDIDATES - MIN_CANDIDATES));
  const markers: RegionMarker[] = [];

  for (let index = 0; index < count; index++) {
    if (input.signal?.aborted) {
      throw new GenerationCancelledError();
    }
    const region = input.regions[index];
    if (!region) {
      throw new Error(`Region configuration has no entry for region-${index + 1}.`);
    }
    const centred = index === 0 && containsNormalized(input.shape, WORLD_CENTRE);
    const preferred = THERMAL_ANCHOR_PREFERENCE[region.type];
    const coupling = clamp01(input.geologyCoupling);
    const thermalBias =
      preferred && coupling > 0
        ? {
            preferred,
            bonus: idealSpacing * THERMAL_ANCHOR_BIAS_SHARE * coupling,
            maxShift: idealSpacing * THERMAL_ANCHOR_MAX_SHIFT_SHARE * coupling,
          }
        : undefined;
    const centre = centred
      ? WORLD_CENTRE
      : findMarkerCentre(
          input.random.create(`geology.partition.marker.region-${index + 1}`),
          markers,
          minSeparation,
          candidates,
          thermalBias,
          input
        );
    if (!centre) {
      throw new Error(
        `Geology layout is infeasible: ${count} regions cannot spread over this world.`
      );
    }
    markers.push({
      id: `region-${index + 1}`,
      type: region.type,
      centre,
      weight: region.size,
    });
    input.report?.((index + 1) / count);
  }
  return markers;
}

/** Widest-gap pick among the region's candidates, inside the world mask. */
function findMarkerCentre(
  stream: SeededRandom,
  placed: readonly RegionMarker[],
  minSeparation: number,
  candidates: number,
  thermalBias: ThermalBias | undefined,
  input: MarkerPlacementInput
): WorldPoint | undefined {
  let best: WorldPoint | undefined;
  let bestClearance = -Infinity;
  let matching: WorldPoint | undefined;
  let matchingClearance = -Infinity;
  let accepted = 0;
  for (let attempt = 0; attempt < MARKER_ATTEMPTS && accepted < candidates; attempt++) {
    const point = { x: stream.next(), y: stream.next() };
    if (!containsNormalized(input.shape, point)) {
      continue;
    }
    let clearance = Infinity;
    for (const marker of placed) {
      clearance = Math.min(clearance, input.space.distanceMeters(point, marker.centre));
    }
    if (clearance < minSeparation) {
      continue;
    }
    accepted++;
    if (clearance > bestClearance) {
      bestClearance = clearance;
      best = point;
    }
    if (
      thermalBias !== undefined &&
      input.thermalAt(point) === thermalBias.preferred &&
      clearance > matchingClearance
    ) {
      matchingClearance = clearance;
      matching = point;
    }
  }
  if (!thermalBias || !best || !matching) {
    return best;
  }
  if (bestClearance - matchingClearance > thermalBias.bonus) {
    return best;
  }
  if (input.space.distanceMeters(best, matching) > thermalBias.maxShift) {
    return best;
  }
  return matching;
}

interface ThermalBias {
  readonly preferred: HeatZoneClass;
  readonly bonus: number;
  readonly maxShift: number;
}
