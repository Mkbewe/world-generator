import { MAX_REEF_SITES } from './defaults';
import { validateGeologyConfig } from './geology-check';
import type { WorldDimensions } from '../../../world-dimensions';
import { containsNormalized, type WorldShape } from '../../../world-shape';
import { GenerationCancelledError, type StageFailure } from '../../errors';
import type { RandomFactory } from '../../random';
import type { SeededRandom } from '../../random/seeded-random';
import { planarDistance } from '../../space';
import { CHARACTER_RANGES, sampleRange } from '../../terrain-profile';
import type {
  GeologicalAreaConfig,
  GeologicalAreaPlan,
  GeologyPlacementProblem,
  GeologyPlan,
  ReefSite,
  TerrainCharacter,
  TerrainProfile,
  WorldPoint,
} from '../../types';

/** Share of an area influence that must lie inside the world. */
const INSIDE_SHARE = 0.6;

/** Candidate centres drawn for one automatic area. */
const CANDIDATES = 24;

/** Probe resolution of the influence share, per axis. */
const SHARE_SAMPLES = 5;

/** Rejection attempts to draw one random point inside the shape. */
const POINT_ATTEMPTS = 64;
const MIN_REEF_SITES = 3;

/** Raised when areas cannot be placed; one problem per offending entry. */
export class GeologyPlacementError extends Error {
  constructor(readonly problems: readonly GeologyPlacementProblem[]) {
    super(problems.map(placementProblemText).join(' '));
    this.name = 'GeologyPlacementError';
  }

  /** Entry-level shape the pipeline transports without knowing the domain. */
  get failures(): readonly StageFailure[] {
    return this.problems.map(problem => ({ id: problem.areaId, message: problem.reason }));
  }
}

/** Wording of one placement problem; the structured failures carry the id. */
function placementProblemText(problem: GeologyPlacementProblem): string {
  return `Area "${problem.areaId}" could not be placed: ${problem.reason}`;
}

/**
 * Builds the deterministic plan for one seed. Areas are processed in id order,
 * so the config list order never changes a position, a profile or a problem.
 * Placement and profile draw from named streams derived from the area id
 * (`geology.area.<id>.placement` and `geology.area.<id>.profile`): every entry
 * keeps its own candidate draws however other entries are added or reordered,
 * and changing relief never moves an area. Automatic areas still spread
 * against their already placed neighbours in id order, so an entry added
 * before existing ones may shift their pick among their own candidates.
 *
 * Temporary during the geology cutover: the `unknown` input keeps the runtime
 * guard callable without a cast; it returns to `GeologyConfig` when the public
 * contract is settled.
 */
export function buildGeologyPlan(
  config: unknown,
  random: RandomFactory,
  shape: WorldShape,
  dimensions: WorldDimensions,
  signal?: AbortSignal
): GeologyPlan {
  validateGeologyConfig(config);
  const ordered = [...config.areas].sort((left, right) => compareAreaIds(left.id, right.id));
  const areas: GeologicalAreaPlan[] = [];
  const problems: GeologyPlacementProblem[] = [];

  for (const area of ordered) {
    if (signal?.aborted) {
      throw new GenerationCancelledError();
    }
    const placement = random.create(`geology.area.${area.id}.placement`);
    const centre = resolveCentre(area, shape, placement, areas);
    if (!centre) {
      problems.push({
        areaId: area.id,
        reason: `no valid spot keeps ${Math.round(INSIDE_SHARE * 100)}% of the influence inside the world`,
      });
      continue;
    }
    areas.push({
      ...planFields(area, centre),
      profile: sampleProfile(area.relief, random.create(`geology.area.${area.id}.profile`)),
      reefSites: planReefSites(
        area,
        centre,
        shape,
        dimensions,
        random.create(`geology.area.${area.id}.reefs`)
      ),
    });
  }

  if (problems.length > 0) {
    throw new GeologyPlacementError(problems);
  }
  return { areas };
}

/** Several seeded local tendencies replace one area-wide atoll ring. */
function planReefSites(
  area: GeologicalAreaConfig,
  centre: WorldPoint,
  shape: WorldShape,
  dimensions: WorldDimensions,
  random: SeededRandom
): readonly ReefSite[] {
  if (area.rimStrength === 0) {
    return [];
  }
  const worldSizeMeters = Math.max(dimensions.widthMeters, dimensions.heightMeters);
  const extentMeters = area.extent * worldSizeMeters;
  const radiusMeters = Math.max(35, Math.min(110, area.upliftScaleMeters * 0.15));
  const count = Math.max(
    MIN_REEF_SITES,
    Math.min(MAX_REEF_SITES, Math.round(0.4 * (extentMeters / radiusMeters) ** 2))
  );
  const radius = Math.min(radiusMeters / worldSizeMeters, area.extent * 0.24);
  const cos = Math.cos(area.direction);
  const sin = Math.sin(area.direction);
  const acrossScale = 1 + 2 * area.elongation;
  const sites: ReefSite[] = [];
  for (let attempt = 0; attempt < count * 8 && sites.length < count; attempt++) {
    const angle = random.next() * Math.PI * 2;
    const distance = Math.sqrt(random.next()) * (area.extent - radius) * 0.85;
    const along = Math.cos(angle) * distance;
    const across = (Math.sin(angle) * distance) / acrossScale;
    const siteCentre = {
      x: centre.x + along * cos - across * sin,
      y: centre.y + along * sin + across * cos,
    };
    if (insideShape(shape, siteCentre)) {
      sites.push({ centre: siteCentre, radius: radius * (0.75 + random.next() * 0.5) });
    }
  }
  return sites;
}

/** Plain code-unit order; the same comparator the plan validation enforces. */
export function compareAreaIds(left: string, right: string): number {
  if (left === right) {
    return 0;
  }
  return left < right ? -1 : 1;
}

function resolveCentre(
  area: GeologicalAreaConfig,
  shape: WorldShape,
  placement: SeededRandom,
  placed: readonly GeologicalAreaPlan[]
): WorldPoint | undefined {
  if (area.placement.kind === 'fixed') {
    const point = area.placement.position;
    return influenceShare(point, area.extent, shape) >= INSIDE_SHARE ? point : undefined;
  }
  return searchCentre(area.extent, shape, placement, placed);
}

function searchCentre(
  extent: number,
  shape: WorldShape,
  placement: SeededRandom,
  placed: readonly GeologicalAreaPlan[]
): WorldPoint | undefined {
  let best: WorldPoint | undefined;
  let bestSpread = -Infinity;

  for (let attempt = 0; attempt < CANDIDATES; attempt++) {
    const candidate = randomPointInShape(shape, placement);
    if (!candidate || influenceShare(candidate, extent, shape) < INSIDE_SHARE) {
      continue;
    }
    const spread = spreadOf(candidate, extent, placed);
    if (spread > bestSpread) {
      best = candidate;
      bestSpread = spread;
    }
  }
  return best;
}

/** Free gap to the nearest influence, rather than distance between centres. */
function spreadOf(
  point: WorldPoint,
  extent: number,
  placed: readonly GeologicalAreaPlan[]
): number {
  let nearest = Infinity;
  for (const area of placed) {
    nearest = Math.min(nearest, planarDistance(area.centre, point) - extent - area.extent);
  }
  return nearest;
}

function randomPointInShape(shape: WorldShape, random: SeededRandom): WorldPoint | undefined {
  for (let attempt = 0; attempt < POINT_ATTEMPTS; attempt++) {
    const point = { x: random.next(), y: random.next() };
    if (insideShape(shape, point)) {
      return point;
    }
  }
  return undefined;
}

/** Share of the influence disk inside the world, from a fixed probe grid. */
function influenceShare(centre: WorldPoint, extent: number, shape: WorldShape): number {
  let total = 0;
  let inside = 0;
  for (let y = 0; y < SHARE_SAMPLES; y++) {
    for (let x = 0; x < SHARE_SAMPLES; x++) {
      const point = {
        x: centre.x + ((x + 0.5) / SHARE_SAMPLES - 0.5) * 2 * extent,
        y: centre.y + ((y + 0.5) / SHARE_SAMPLES - 0.5) * 2 * extent,
      };
      if (planarDistance(point, centre) > extent) {
        continue;
      }
      total++;
      if (insideShape(shape, point)) {
        inside++;
      }
    }
  }
  return total === 0 ? 0 : inside / total;
}

/** Mask containment of a normalized point, through the shared world-shape port. */
function insideShape(shape: WorldShape, point: WorldPoint): boolean {
  return containsNormalized(shape, point);
}

function planFields(
  area: GeologicalAreaConfig,
  centre: WorldPoint
): Omit<GeologicalAreaPlan, 'profile' | 'reefSites'> {
  return {
    id: area.id,
    character: area.character,
    centre,
    extent: area.extent,
    elongation: area.elongation,
    direction: area.direction,
    upliftDensity: area.upliftDensity,
    upliftScaleMeters: area.upliftScaleMeters,
    fragmentation: area.fragmentation,
    seabedOffsetMeters: area.seabedOffsetMeters,
    shelfWidthMeters: area.shelfWidthMeters,
    rimStrength: area.rimStrength,
    relief: area.relief,
  };
}

function sampleProfile(relief: TerrainCharacter, random: SeededRandom): TerrainProfile {
  const ranges = CHARACTER_RANGES[relief];
  return {
    elevation: sampleRange(ranges.elevation, random.next()),
    roughness: sampleRange(ranges.roughness, random.next()),
    mountainStrength: sampleRange(ranges.mountainStrength, random.next()),
    hillStrength: sampleRange(ranges.hillStrength, random.next()),
    plateauStrength: sampleRange(ranges.plateauStrength, random.next()),
    lakePotential: sampleRange(ranges.lakePotential, random.next()),
    erosionStrength: sampleRange(ranges.erosionStrength, random.next()),
    coastalCliffStrength: sampleRange(ranges.coastalCliffStrength, random.next()),
  };
}
