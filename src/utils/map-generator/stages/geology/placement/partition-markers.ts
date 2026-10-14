import type { WorldDimensions } from '../../../../world-dimensions';
import { containsNormalized, type WorldShape } from '../../../../world-shape';
import { GenerationCancelledError } from '../../../errors';
import type { RandomFactory } from '../../../random';
import type { SeededRandom } from '../../../random/seeded-random';
import type { WorldSpace } from '../../../space';
import type { GeologicalRegionConfig, GeologicalRegionType, WorldPoint } from '../../../types';

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
  readonly signal?: AbortSignal;
  readonly report?: (progress: number) => void;
}

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
    const centre = centred
      ? WORLD_CENTRE
      : findMarkerCentre(
          input.random.create(`geology.partition.marker.region-${index + 1}`),
          markers,
          minSeparation,
          candidates,
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
  input: MarkerPlacementInput
): WorldPoint | undefined {
  let best: WorldPoint | undefined;
  let bestClearance = -Infinity;
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
  }
  return best;
}
