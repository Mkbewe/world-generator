import { mainCentre, nextCentre } from './placement';
import type { WorldDimensions } from '../../../../world-dimensions';
import type { RandomFactory, SeededRandom } from '../../../random';
import type { WorldSpace } from '../../../space';
import type {
  GeologicalRegionPlan,
  GeologyPlan,
  RegionTerrainConfig,
  WorldPoint,
} from '../../../types';
import { REGION_SHAPES, type RegionShape } from '../config/region-shape';
import {
  BORDER_GATE_FADE_METERS,
  BORDER_GATE_METERS,
  MAX_FORMS_PER_REGION,
  MIN_ISLAND_RADIUS_METERS,
} from '../defaults';

/** One bay bite of an island outline: bearing, bite depth and angular width. */
export interface IslandBay {
  readonly angle: number;
  readonly depth: number;
  readonly width: number;
}

/** One island mass stamped into the height field; all sizes are in metres. */
export interface IslandForm {
  readonly regionIndex: number;
  /** Footprint centre of the island mass, in normalized 0..1 coordinates. */
  readonly centre: WorldPoint;
  /** Asymmetric summit shifted toward one edge to create a steep cliff side. */
  readonly peak: WorldPoint;
  /** Nominal land radius in metres where the profile crosses 0 m. */
  readonly radiusMeters: number;
  /** Outer radius in metres where the underwater shelf meets the ocean floor. */
  readonly shelfRadiusMeters: number;
  /** Peak height of this specific island in metres. */
  readonly peakMeters: number;
  /** Orientation angle in radians and axis stretch for non-circular islands. */
  readonly angleRadians: number;
  readonly aspect: number;
  /** Arc bend of the island axis, -0.45..0.45; bows the mass into crescents. */
  readonly bend: number;
  /** This island's own mountainousness, 0..1; drives plains versus ridges. */
  readonly mountainFactor: number;
  /** Harmonic coastline lobes: amplitudes and phases of the 2/3/4 lobes. */
  readonly lobes2: number;
  readonly phase2: number;
  readonly lobes3: number;
  readonly phase3: number;
  readonly lobes4: number;
  readonly phase4: number;
  /** Whether this form has an inner cavity: a crater or a lagoon. */
  readonly hasCavity: boolean;
  /** Random angular phase of the region's coastal channels (fjords). */
  readonly chutePhase: number;
  /** The island's bays: bearings, bite depths and angular widths. */
  readonly bays: readonly IslandBay[];
  /** How wide the atoll mouth opens, 0..1; 0 keeps the ring closed. */
  readonly reefGap: number;
}

export interface RegionFormsInput {
  readonly regionIndex: number;
  readonly region: GeologicalRegionPlan;
  /** Terrain parameters of this region, already resolved from the config. */
  readonly terrain: RegionTerrainConfig;
  /** Interior cell indices: every cell of this region deeper than the gate margin. */
  readonly cells: readonly number[];
  readonly ownerMap: Int16Array;
  readonly borderDistanceMap: Float32Array;
  readonly dimensions: WorldDimensions;
  readonly space: WorldSpace;
  readonly random: RandomFactory;
  readonly amplitudeMeters: number;
}

/** Land area drawn from the slider, and the compensation for overlapping forms. */
const LAND_SHARE_FLOOR = 0.03;
const LAND_SHARE_RANGE = 0.97;
const AREA_COMPENSATION = 1;
/** The biggest island of a region, as a share of the region's square root. */
const MAX_RADIUS_SHARE = 0.2;
/** Below this land share the form count shrinks to avoid tiny specks. */
const SPARSE_LAND_SHARE = 0.15;
/** Deep bays of a plain island: how far they bite in and their width. */
const BAY_DEPTH_MIN = 0.25;
const BAY_DEPTH_RANGE = 0.45;
const BAY_WIDTH_MIN = 0.35;
const BAY_WIDTH_RANGE = 0.35;
/** Bays drawn per form and the share of them that stays idle. */
const BAY_COUNT = 3;
const BAY_IDLE_SHARE = 0.35;
/** Per-island variation: falling size, age relief, cliff shift. */
const SIZE_FALLING_POWER = 0.55;
const AGE_RELIEF_SHARE = 0.35;
/** Plain island summit offset from the centre, as a share of the radius. */
const CLIFF_OFFSET_MIN = 0.35;
const CLIFF_OFFSET_RANGE = 0.55;
const AGE_CLIFF_SHARE = 0.4;
/** Cavities need their smallest feature to span this many raster cells. */
const CAVITY_MIN_CELLS = 1.5;
/** Lowest peak of any form: reef crests and sandy islets sit just above water. */
const MIN_PEAK_METERS = 3.5;
/** Cavity forms keep their summit near the centre so the crater sits on it. */
const CAVITY_PEAK_OFFSET_SHARE = 0.15;
/** Plain forms carry only this share of the type's shelf: a ring lives on a
 * wide bank, a solid island does not. */
const PLAIN_SHELF_SHARE = 0.4;
/** Share of the short semi-axis a plain island's summit may travel. */
const PLAIN_PEAK_SHORT_SHARE = 0.85;

/**
 * Interior cells of every region, indexed by region: all cells deeper than
 * the border gate margin. One pass over the owner raster, so regions never
 * rescan the whole world.
 */
export function collectRegionInteriors(
  plan: GeologyPlan,
  ownerMap: Int16Array,
  borderDistanceMap: Float32Array
): readonly (readonly number[])[] {
  const interiors: number[][] = plan.regions.map(() => []);
  for (let index = 0; index < ownerMap.length; index++) {
    const region = ownerMap[index];
    if (region >= 0 && borderDistanceMap[index] > BORDER_GATE_METERS) {
      interiors[region]?.push(index);
    }
  }
  return interiors;
}

/**
 * Builds the island forms of one region: seeded, seed-stable masses whose
 * count, sizes and spacing follow the region's concentration and land share,
 * with lobes merging into larger islands and separate masses keeping open
 * sea between them. Every number a form consumes comes from REGION_SHAPES.
 */
export function buildRegionForms(input: RegionFormsInput): IslandForm[] {
  const cells = interiorCells(input.cells, input.borderDistanceMap);
  if (cells.length === 0) {
    return [];
  }
  const shape = REGION_SHAPES[input.region.type];
  const stream = input.random.create(`heightmap.${input.region.id}.forms`);
  const count = formCount(input.terrain, shape);
  const weights = formWeights(stream, count, input.terrain.concentration);
  const radii = formRadii(input.region, input.terrain, shape, weights);
  const maxRadius = radii.reduce((max, radius) => Math.max(max, radius), MIN_ISLAND_RADIUS_METERS);
  const cellMeters = input.dimensions.widthMeters / input.dimensions.sampleWidth;
  const forms: IslandForm[] = [];
  for (let index = 0; index < count; index++) {
    const radiusMeters = radii[index] ?? MIN_ISLAND_RADIUS_METERS;
    const hasCavity = drawCavity(stream, shape, input.terrain, radiusMeters, index, cellMeters);
    const centre =
      index === 0
        ? mainCentre(stream, cells, input, maxRadius)
        : nextCentre(stream, cells, input, shape, forms, radiusMeters, count, hasCavity);
    forms.push(createForm(stream, input, shape, centre, radiusMeters, maxRadius, hasCavity));
  }
  return forms;
}

/**
 * Draws whether a form carries a cavity. Reef regions take the chance from
 * the ring share slider (zero means sandy islets only, even for the main
 * form); other types use their shape constant, with the main form favoured.
 */
function drawCavity(
  stream: SeededRandom,
  shape: RegionShape,
  terrain: RegionTerrainConfig,
  radiusMeters: number,
  formIndex: number,
  cellMeters: number
): boolean {
  const chance = shape.cavityFloorShare < 0 ? clamp01(terrain.ringShare) : shape.cavityShare;
  if (chance <= 0) {
    return false;
  }
  // The ring rim, or the crater as its inverse, must span a couple of cells
  // at the world's raster; below that the cavity aliases into noise.
  const featureShare = Math.min(shape.cavityRadiusShare, 1 - shape.cavityRadiusShare);
  if (radiusMeters < (CAVITY_MIN_CELLS * cellMeters) / Math.max(0.05, featureShare)) {
    return false;
  }
  const favoured = formIndex === 0 ? Math.min(1, chance * 1.35) : chance;
  return stream.next() < favoured;
}

/** Deep interior first; narrow regions fall back to their whole interior. */
function interiorCells(
  cells: readonly number[],
  borderDistanceMap: Float32Array
): readonly number[] {
  const deepMargin = BORDER_GATE_METERS + BORDER_GATE_FADE_METERS;
  const deep: number[] = [];
  for (const index of cells) {
    if (borderDistanceMap[index] >= deepMargin) {
      deep.push(index);
    }
  }
  return deep.length > 0 ? deep : cells;
}

/** Few focused masses or many scattered ones; sparse land sheds forms. */
function formCount(terrain: RegionTerrainConfig, shape: RegionShape): number {
  const concentration = clamp01(terrain.concentration);
  const raw = shape.maxForms - (shape.maxForms - shape.minForms) * concentration;
  const landShare = clamp01(terrain.landShare);
  if (landShare >= SPARSE_LAND_SHARE) {
    return clampCount(raw);
  }
  return clampCount(raw * (0.5 + (landShare / SPARSE_LAND_SHARE) * 0.5));
}

function clampCount(value: number): number {
  return Math.max(1, Math.min(MAX_FORMS_PER_REGION, Math.round(value)));
}

/** Power-law weights: focused regions let the first form take most of the area. */
function formWeights(stream: SeededRandom, count: number, concentration: number): number[] {
  const exponent = 0.65 + 1.15 * clamp01(concentration);
  const raw = Array.from(
    { length: count },
    (_, index) => Math.pow(index + 1, -exponent) * (0.75 + 0.5 * stream.next())
  );
  const total = raw.reduce((sum, value) => sum + value, 0);
  return raw.map(value => value / total);
}

/** Radii from the region's target land area, floored and capped per region. */
function formRadii(
  region: GeologicalRegionPlan,
  terrain: RegionTerrainConfig,
  shape: RegionShape,
  weights: readonly number[]
): number[] {
  const targetLandArea =
    region.areaSquareMeters *
    shape.coverageFactor *
    (LAND_SHARE_FLOOR + LAND_SHARE_RANGE * clamp01(terrain.landShare));
  const maxRadius = maxRegionRadius(region);
  return weights.map(weight =>
    Math.min(
      maxRadius,
      Math.max(
        MIN_ISLAND_RADIUS_METERS,
        Math.sqrt((targetLandArea * weight * AREA_COMPENSATION) / Math.PI)
      )
    )
  );
}

function maxRegionRadius(region: GeologicalRegionPlan): number {
  return Math.max(MIN_ISLAND_RADIUS_METERS, MAX_RADIUS_SHARE * Math.sqrt(region.areaSquareMeters));
}

/** One silhouette recipe: stretch, arc bend and the three harmonic amplitudes. */
interface OutlineProfile {
  readonly aspect: number;
  readonly bend: number;
  readonly lobes2: number;
  readonly lobes3: number;
  readonly lobes4: number;
}

/**
 * Picks one clearly different silhouette family, so no two kinds of islet
 * share the same default shape: a rounded cay, a long spit, a peninsular
 * island with a single dominant harmonic (never two), or a crescent hook.
 * Cavity forms (atolls, calderas) draw their own moderate defaults.
 */
function pickOutline(stream: SeededRandom, hasCavity: boolean): OutlineProfile {
  if (hasCavity) {
    return {
      aspect: 1.05 + 0.55 * stream.next(),
      bend: (stream.next() - 0.5) * 0.4,
      lobes2: 0.08 + 0.16 * stream.next(),
      lobes3: 0.06 + 0.14 * stream.next(),
      lobes4: 0.04 + 0.12 * stream.next(),
    };
  }
  const roll = stream.next();
  if (roll < 0.25) {
    return {
      aspect: 1 + 0.35 * stream.next(),
      bend: (stream.next() - 0.5) * 0.18,
      lobes2: 0.04 + 0.1 * stream.next(),
      lobes3: 0.02 + 0.06 * stream.next(),
      lobes4: 0.02 + 0.06 * stream.next(),
    };
  }
  if (roll < 0.5) {
    return {
      aspect: 2.1 + 1.3 * stream.next(),
      bend: (stream.next() - 0.5) * 0.55,
      lobes2: 0.14 + 0.18 * stream.next(),
      lobes3: 0.02 + 0.05 * stream.next(),
      lobes4: 0.03 + 0.07 * stream.next(),
    };
  }
  if (roll < 0.78) {
    const dominantThree = stream.next() < 0.5;
    const lobes3 = dominantThree ? 0.22 + 0.16 * stream.next() : 0.04 + 0.04 * stream.next();
    const lobes4 = dominantThree ? 0.04 + 0.04 * stream.next() : 0.18 + 0.14 * stream.next();
    return {
      aspect: 1.15 + 0.75 * stream.next(),
      bend: (stream.next() - 0.5) * 0.25,
      lobes2: 0.06 + 0.08 * stream.next(),
      lobes3,
      lobes4,
    };
  }
  const side = stream.next() < 0.5 ? -1 : 1;
  return {
    aspect: 1.55 + 0.9 * stream.next(),
    bend: side * (0.35 + 0.3 * stream.next()),
    lobes2: 0.12 + 0.14 * stream.next(),
    lobes3: 0.05 + 0.08 * stream.next(),
    lobes4: 0.03 + 0.06 * stream.next(),
  };
}

/** Per-island character: silhouette, orientation, relief and the cliff offset. */
function createForm(
  stream: SeededRandom,
  input: RegionFormsInput,
  shape: RegionShape,
  centre: WorldPoint,
  radiusMeters: number,
  maxRadiusMeters: number,
  hasCavity: boolean
): IslandForm {
  const outline = pickOutline(stream, hasCavity);
  const phase2 = stream.next() * Math.PI * 2;
  const phase3 = stream.next() * Math.PI * 2;
  const phase4 = stream.next() * Math.PI * 2;
  const angleRadians = stream.next() * Math.PI * 2;
  const { relief, mountainFactor } = islandRelief(stream, input.terrain, shape);
  const sizeFactor = Math.pow(radiusMeters / maxRadiusMeters, SIZE_FALLING_POWER);
  const age = clamp01(input.terrain.age);
  const peakMeters = Math.max(
    MIN_PEAK_METERS,
    input.amplitudeMeters *
      shape.amplitudeFactor *
      relief *
      sizeFactor *
      (1 - AGE_RELIEF_SHARE * age)
  );
  // Plain islands carry their summit near a shore; the type's cliff share
  // shapes how steep that shore gets, not how far the summit travels.
  const rawOffset =
    radiusMeters *
    (CLIFF_OFFSET_MIN + CLIFF_OFFSET_RANGE * stream.next()) *
    (1 - AGE_CLIFF_SHARE * age);
  // A cavity keeps its summit near the centre so the crater sits on the peak;
  // a plain island never lets it slide past the short shore, or the land
  // would lose its highest ground.
  const offsetMeters = hasCavity
    ? Math.min(rawOffset, CAVITY_PEAK_OFFSET_SHARE * radiusMeters)
    : Math.min(rawOffset, PLAIN_PEAK_SHORT_SHARE * (radiusMeters / Math.sqrt(outline.aspect)));
  // The summit faces the island's short axis, so its shore is the closest
  // one: that is where the coast turns into a cliff; the long shores keep
  // their beaches.
  const cliffAngle = angleRadians + Math.PI / 2 + (stream.next() - 0.5) * 1.1;
  const peak = {
    x: centre.x + (Math.cos(cliffAngle) * offsetMeters) / input.dimensions.widthMeters,
    y: centre.y + (Math.sin(cliffAngle) * offsetMeters) / input.dimensions.heightMeters,
  };
  const chutePhase = stream.next() * Math.PI * 2;
  const bays: IslandBay[] = [];
  for (let bayIndex = 0; bayIndex < BAY_COUNT; bayIndex++) {
    bays.push({
      angle: stream.next() * Math.PI * 2,
      width: BAY_WIDTH_MIN + BAY_WIDTH_RANGE * stream.next(),
      depth:
        !hasCavity && stream.next() >= BAY_IDLE_SHARE
          ? BAY_DEPTH_MIN + BAY_DEPTH_RANGE * stream.next()
          : 0,
    });
  }
  const reefGap = hasCavity ? 0.25 + 0.75 * stream.next() : 0;
  const shelfFactor = hasCavity
    ? shape.shelfFactor
    : 1 + (shape.shelfFactor - 1) * PLAIN_SHELF_SHARE;
  return {
    regionIndex: input.regionIndex,
    centre,
    peak,
    radiusMeters,
    shelfRadiusMeters: radiusMeters * shelfFactor,
    peakMeters,
    angleRadians,
    aspect: outline.aspect,
    bend: outline.bend,
    mountainFactor,
    lobes2: outline.lobes2,
    phase2,
    lobes3: outline.lobes3,
    phase3,
    lobes4: outline.lobes4,
    phase4,
    hasCavity,
    chutePhase,
    bays,
    reefGap,
  };
}

/**
 * Per-island relief and mountainousness: with the slider low the island is a
 * green plain without brown peaks; a high slider draws ridges on some islands.
 */
function islandRelief(
  stream: SeededRandom,
  terrain: RegionTerrainConfig,
  shape: RegionShape
): { readonly relief: number; readonly mountainFactor: number } {
  if (!shape.usesMountainousness) {
    // Types without the slider keep a fixed character, carried by how rocky
    // the type is: a rocky type has no flat lowlands, a sandy one is one
    // solid flat bank high above the shoreline.
    return {
      relief: 0.65 + 0.55 * stream.next(),
      mountainFactor: clamp01(shape.cliffShare),
    };
  }
  const mountainousness = clamp01(terrain.mountainousness);
  const mountainFactor = mountainousness * Math.pow(stream.next(), 1.6 - 1.1 * mountainousness);
  return { relief: 0.08 + 1.25 * mountainFactor, mountainFactor };
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}
