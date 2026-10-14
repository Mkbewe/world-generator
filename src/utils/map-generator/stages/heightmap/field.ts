import type { HeightmapNoiseBands } from './bands';
import {
  BORDER_GATE_FADE_METERS,
  BORDER_GATE_METERS,
  BORDER_GATE_WARP_SHARE,
  COAST_DETAIL_SHARE,
  FIELD_SMOOTH_PASSES,
  FIELD_SMOOTH_SHARE,
  HILL_WARP_SHARE,
  ISLET_BUMP_METERS,
  ISLET_MAX_DEPTH_METERS,
  ISLET_PRACTICAL_MAX,
  ISLET_ROCK_LEVEL,
  ISLET_ZONE_LEVEL,
  ISLET_ZONE_MIN,
  OCEAN_FLOOR_METERS,
  PROVENANCE_OUTSIDE,
  SHELF_DEPTH_METERS,
} from './defaults';
import { landAmplitudeMeters } from './fields';
import { buildRegionForms, collectRegionInteriors, type IslandForm } from './forms';
import { REGION_SHAPES, type RegionShape } from './region-shape';
import { defaultRegionTerrain } from './region-terrain';
import { smoothstep } from '../../../math';
import type { WorldDimensions } from '../../../world-dimensions';
import { GenerationCancelledError } from '../../errors';
import type { RandomFactory } from '../../random';
import type { WorldSpace } from '../../space';
import type { GeologyPlan, HeightmapConfig, WorldPoint } from '../../types';
import { validateGeologyPlan } from '../geology';

export interface HeightFieldInput {
  readonly plan: GeologyPlan;
  /** The shared family: the ocean floor and the border gate. */
  readonly bands: HeightmapNoiseBands;
  /** One family per planned region, in plan order; shapes differ per region. */
  readonly regionBands: readonly HeightmapNoiseBands[];
  readonly random: RandomFactory;
  readonly worldMask: Uint8Array;
  readonly dimensions: WorldDimensions;
  readonly space: WorldSpace;
  readonly config: HeightmapConfig;
  readonly signal?: AbortSignal;
  readonly report?: (progress: number) => void;
}

export interface HeightField {
  /** Height relative to the waterline, in metres: 0 is water, land is above 0. */
  readonly heightmap: Float32Array;
  /** Region index for each inside-world cell; -1 outside the world. */
  readonly provenanceMap: Int16Array;
}

/** Slope asymmetry range: the local curve grows across this share of the radius. */
const ASYMMETRY_SPAN = 1.35;
/** Extra smoothing radius of regions older than this on the 0..1 age slider. */
const AGE_SMOOTH_THRESHOLD = 0.65;
const AGE_SMOOTH_SCALE = 1.5;
/** How strongly overlapping lobes merge instead of summing into spikes. */
const LOBE_MERGE_SHARE = 0.3;
/** Land this low above the waterline reads as water at the coast. */
const SHORE_METERS = 0.5;
/** Islets only rise where the gate has faded in past this share. */
const ISLET_GATE_MIN = 0.25;

/** Mutable scratch of one build; forms and stamps fill it, the mix reads it. */
interface FieldContext {
  readonly plan: GeologyPlan;
  readonly bands: HeightmapNoiseBands;
  readonly regionBands: readonly HeightmapNoiseBands[];
  readonly ownerMap: Int16Array;
  readonly borderDistanceMap: Float32Array;
  readonly worldMask: Uint8Array;
  readonly dimensions: WorldDimensions;
  readonly space: WorldSpace;
  readonly config: HeightmapConfig;
  readonly landUplift: Float32Array;
  readonly shelfWeight: Float32Array;
  readonly radiusCells: Int32Array;
  readonly cellMeters: number;
  readonly signal?: AbortSignal;
  readonly report?: (progress: number) => void;
}

/**
 * Builds the height field in metres: seeded island forms per region are
 * stamped over their bounding boxes (lobes merge into bigger masses, separate
 * masses keep open sea), the land wears its interior texture, and the
 * composition then blends open ocean, shelf and land around the waterline of
 * 0 m. Techniques follow the references: Red Blob island shaping, Azgaar
 * template steps, World Machine crater invert, iq domain warp.
 */
export function buildHeightField(input: HeightFieldInput): HeightField {
  const { plan, bands, regionBands, random, worldMask, dimensions, space, config } = input;
  validateGeologyPlan(plan);
  if (worldMask.length !== space.sampleWidth * space.sampleHeight) {
    throw new Error('The world mask must match the heightmap raster size.');
  }
  const ownerMap = plan.regionOwnerMap;
  const borderDistanceMap = plan.regionBorderDistanceMap;
  if (ownerMap.length !== worldMask.length) {
    throw new Error('Region rasters must match the world mask.');
  }
  const cells = worldMask.length;
  const heightmap = new Float32Array(cells);
  const provenanceMap = new Int16Array(cells).fill(PROVENANCE_OUTSIDE);
  const worldSize = Math.max(dimensions.widthMeters, dimensions.heightMeters);
  const amplitude = landAmplitudeMeters(worldSize, config.relief);
  const context: FieldContext = {
    plan,
    bands,
    regionBands,
    ownerMap,
    borderDistanceMap,
    worldMask,
    dimensions,
    space,
    config,
    landUplift: new Float32Array(cells),
    shelfWeight: new Float32Array(cells),
    radiusCells: new Int32Array(cells).fill(1),
    cellMeters: dimensions.widthMeters / space.sampleWidth,
    signal: input.signal,
    report: input.report,
  };

  const forms = collectForms(context, random, amplitude);
  stampForms(context, forms);
  textureLand(context);
  smoothUplift(
    context.landUplift,
    context.radiusCells,
    space.sampleWidth,
    space.sampleHeight,
    FIELD_SMOOTH_PASSES
  );
  composeSurfaces(context, heightmap, provenanceMap);
  return { heightmap, provenanceMap };
}

/** One form list per region: seeds, sizes and spacing all seeded per region. */
function collectForms(
  context: FieldContext,
  random: RandomFactory,
  amplitudeMeters: number
): IslandForm[] {
  const interiors = collectRegionInteriors(
    context.plan,
    context.ownerMap,
    context.borderDistanceMap
  );
  const forms: IslandForm[] = [];
  const count = context.plan.regions.length;
  for (let index = 0; index < count; index++) {
    if (context.signal?.aborted) {
      throw new GenerationCancelledError();
    }
    const region = context.plan.regions[index];
    if (!region) {
      throw new Error('Region plan is missing a region.');
    }
    forms.push(
      ...buildRegionForms({
        regionIndex: index,
        region,
        terrain: context.config.regions?.[index] ?? defaultRegionTerrain(region.type),
        cells: interiors[index] ?? [],
        ownerMap: context.ownerMap,
        borderDistanceMap: context.borderDistanceMap,
        dimensions: context.dimensions,
        space: context.space,
        random,
        amplitudeMeters,
      })
    );
    context.report?.(0.02 + ((index + 1) / count) * 0.08);
  }
  return forms;
}

/** Stamps every form at its bounding box, never over the whole raster. */
function stampForms(context: FieldContext, forms: readonly IslandForm[]): void {
  if (forms.length === 0) {
    return;
  }
  for (let index = 0; index < forms.length; index++) {
    if (context.signal?.aborted) {
      throw new GenerationCancelledError();
    }
    const form = forms[index];
    if (!form) {
      continue;
    }
    const region = context.plan.regions[form.regionIndex];
    const band = context.regionBands[form.regionIndex];
    if (!region || !band) {
      throw new Error('A form must reference a planned region.');
    }
    const terrain = context.config.regions?.[form.regionIndex] ?? defaultRegionTerrain(region.type);
    stampForm(context, form, REGION_SHAPES[region.type], band, terrain.age);
    context.report?.(0.1 + ((index + 1) / forms.length) * 0.5);
  }
}

/**
 * One form over its bounding box: the shelf ring writes the underwater
 * footprint, the land core writes the warped and tilted height profile with
 * its optional cavity.
 */
function stampForm(
  context: FieldContext,
  form: IslandForm,
  shape: RegionShape,
  band: HeightmapNoiseBands,
  age: number
): void {
  const { worldMask, ownerMap, dimensions, space, landUplift, shelfWeight, radiusCells } = context;
  const boundMeters =
    form.shelfRadiusMeters * (1 + HILL_WARP_SHARE * shape.warpFactor) * form.aspect;
  const minCell = space.normalizedToCell(
    form.centre.x - boundMeters / dimensions.widthMeters,
    form.centre.y - boundMeters / dimensions.heightMeters
  );
  const maxCell = space.normalizedToCell(
    form.centre.x + boundMeters / dimensions.widthMeters,
    form.centre.y + boundMeters / dimensions.heightMeters
  );
  const radius = smoothRadiusCells(form.radiusMeters, age, context.cellMeters);
  for (let y = minCell.y; y <= maxCell.y; y++) {
    for (let x = minCell.x; x <= maxCell.x; x++) {
      const index = y * space.sampleWidth + x;
      if (worldMask[index] === 0 || ownerMap[index] !== form.regionIndex) {
        continue;
      }
      const point = space.cellToNormalized(x, y);
      const warped = warpPoint(point, form, band, shape, dimensions);
      const distMeters = space.distanceMeters(warped, form.centre);
      if (distMeters >= form.shelfRadiusMeters) {
        continue;
      }
      radiusCells[index] = Math.max(radiusCells[index], radius);
      if (distMeters > form.radiusMeters) {
        const shelf =
          1 -
          (distMeters - form.radiusMeters) /
            Math.max(1, form.shelfRadiusMeters - form.radiusMeters);
        shelfWeight[index] = Math.max(shelfWeight[index], smoothstep(shelf));
        continue;
      }
      shelfWeight[index] = 1;
      const height = formHeight(form, shape, warped, distMeters, space);
      mergeUplift(landUplift, index, height);
    }
  }
}

/** The radial profile: tilted by the peak offset, carved by an optional cavity. */
function formHeight(
  form: IslandForm,
  shape: RegionShape,
  warped: WorldPoint,
  distMeters: number,
  space: WorldSpace
): number {
  const t = 1 - distMeters / form.radiusMeters;
  const peakDistance = space.distanceMeters(warped, form.peak) / form.radiusMeters;
  const asymmetry = clamp01(peakDistance / ASYMMETRY_SPAN);
  const localCurve = shape.heightCurve * (0.55 + 0.9 * asymmetry);
  let height = form.peakMeters * Math.pow(smoothstep(t), localCurve);
  if (form.hasCavity) {
    const cavity = cavityBlend(distMeters / form.radiusMeters, shape);
    height += cavity * (form.peakMeters * shape.cavityFloorShare - height);
  }
  return height;
}

/** Overlapping positive forms merge gently; a negative cavity digs water. */
function mergeUplift(uplift: Float32Array, index: number, height: number): void {
  const previous = uplift[index];
  if (height < 0) {
    uplift[index] = Math.min(previous, height);
    return;
  }
  const land = Math.max(0, previous);
  uplift[index] = Math.max(land, height) + LOBE_MERGE_SHARE * Math.min(land, height);
}

/**
 * The sample point is warped by its region's bands in proportion to the form
 * radius, then stretched across the minor axis: the anisotropic distance of
 * the warped point is the island's footprint.
 */
function warpPoint(
  point: WorldPoint,
  form: IslandForm,
  band: HeightmapNoiseBands,
  shape: RegionShape,
  dimensions: WorldDimensions
): WorldPoint {
  const warpMeters = HILL_WARP_SHARE * shape.warpFactor * form.radiusMeters;
  const warped = {
    x: point.x + (warpMeters * band.large(point)) / dimensions.widthMeters,
    y: point.y + (warpMeters * band.medium(point)) / dimensions.heightMeters,
  };
  return applyAspect(warped, form, dimensions);
}

function applyAspect(point: WorldPoint, form: IslandForm, dimensions: WorldDimensions): WorldPoint {
  const offsetX = (point.x - form.centre.x) * dimensions.widthMeters;
  const offsetY = (point.y - form.centre.y) * dimensions.heightMeters;
  const cos = Math.cos(form.angleRadians);
  const sin = Math.sin(form.angleRadians);
  const along = cos * offsetX + sin * offsetY;
  const across = (-sin * offsetX + cos * offsetY) / form.aspect;
  return {
    x: form.centre.x + (cos * along - sin * across) / dimensions.widthMeters,
    y: form.centre.y + (sin * along + cos * across) / dimensions.heightMeters,
  };
}

/** Smooth bowl blend of the cavity: 1 at the centre, 0 at its rim. */
function cavityBlend(radial: number, shape: RegionShape): number {
  const edge = shape.cavityRadiusShare;
  if (edge <= 0) {
    return 0;
  }
  return smoothstep(clamp01((edge - radial) / edge));
}

/** Older regions smooth farther, which reads as an eroded coastline. */
function smoothRadiusCells(radiusMeters: number, age: number, cellMeters: number): number {
  const ageScale = age > AGE_SMOOTH_THRESHOLD ? AGE_SMOOTH_SCALE : 1;
  return Math.max(1, Math.round((radiusMeters * FIELD_SMOOTH_SHARE * ageScale) / cellMeters));
}

/** Land texture: fine roughness, medium bends and the ridged crests. */
function textureLand(context: FieldContext): void {
  const { worldMask, ownerMap, landUplift, regionBands, plan, space } = context;
  for (let y = 0; y < space.sampleHeight; y++) {
    if (context.signal?.aborted) {
      throw new GenerationCancelledError();
    }
    for (let x = 0; x < space.sampleWidth; x++) {
      const index = y * space.sampleWidth + x;
      if (worldMask[index] === 0 || landUplift[index] <= 0) {
        continue;
      }
      const region = plan.regions[ownerMap[index]];
      const band = regionBands[ownerMap[index]];
      if (!region || !band) {
        continue;
      }
      const point = space.cellToNormalized(x, y);
      landUplift[index] *= landTexture(band, point, REGION_SHAPES[region.type]);
    }
    context.report?.(0.6 + ((y + 1) / space.sampleHeight) * 0.08);
  }
}

function landTexture(band: HeightmapNoiseBands, point: WorldPoint, shape: RegionShape): number {
  const medium = band.medium(point);
  const fine = band.fine(point);
  const ridge = 1 - Math.abs(medium);
  return (
    (1 + shape.modulationShare * fine) *
    (1 + COAST_DETAIL_SHARE * medium) *
    (1 + shape.ridgeShare * (ridge - 0.5))
  );
}

/** Open ocean, shelf and land blended around the fixed waterline of 0 m. */
function composeSurfaces(
  context: FieldContext,
  heightmap: Float32Array,
  provenanceMap: Int16Array
): void {
  const {
    worldMask,
    ownerMap,
    landUplift,
    shelfWeight,
    bands,
    regionBands,
    space,
    config,
    borderDistanceMap,
  } = context;
  for (let y = 0; y < space.sampleHeight; y++) {
    if (context.signal?.aborted) {
      throw new GenerationCancelledError();
    }
    for (let x = 0; x < space.sampleWidth; x++) {
      const index = y * space.sampleWidth + x;
      if (worldMask[index] === 0) {
        continue;
      }
      const point = space.cellToNormalized(x, y);
      const large = bands.large(point);
      const gate = borderGate(borderDistanceMap[index], large);
      const deepFloor = -OCEAN_FLOOR_METERS * (0.6 + 0.4 * (0.5 - 0.5 * large));
      const shelfFloor = -SHELF_DEPTH_METERS * (1 - shelfWeight[index] * gate);
      const seabed = deepFloor + (shelfFloor - deepFloor) * shelfWeight[index] * gate;
      const shaped = gate * landUplift[index];
      let surface = seabed;
      if (shaped > SHORE_METERS) {
        surface = shaped;
      } else if (shaped < 0) {
        surface = seabed + shaped;
      }
      if (
        config.isletFrequency > 0 &&
        surface <= 0 &&
        surface > -ISLET_MAX_DEPTH_METERS &&
        gate > ISLET_GATE_MIN
      ) {
        const band = regionBands[ownerMap[index]];
        if (band) {
          surface += isletBump(band, point, config.isletFrequency);
        }
      }
      heightmap[index] = Math.fround(surface);
      provenanceMap[index] = ownerMap[index];
    }
    context.report?.(0.72 + ((y + 1) / space.sampleHeight) * 0.28);
  }
}

/**
 * Ragged land end before the region border: zero inside the shifted margin,
 * then a smooth ramp to full strength. Land can never cross the border.
 */
function borderGate(distanceMeters: number, warp: number): number {
  const start = BORDER_GATE_METERS * (1 + BORDER_GATE_WARP_SHARE * warp);
  if (distanceMeters <= start) {
    return 0;
  }
  const full = start + BORDER_GATE_FADE_METERS;
  if (distanceMeters >= full) {
    return 1;
  }
  return smoothstep((distanceMeters - start) / BORDER_GATE_FADE_METERS);
}

/**
 * Islets in clusters: the medium band picks the shoals (sometimes here,
 * sometimes not), the fine band picks the individual rocks inside them.
 */
function isletBump(band: HeightmapNoiseBands, point: WorldPoint, frequency: number): number {
  const zoneThreshold = ISLET_ZONE_LEVEL - (ISLET_ZONE_LEVEL - ISLET_ZONE_MIN) * frequency;
  const zone = band.medium(point);
  if (zone <= zoneThreshold) {
    return 0;
  }
  const zoneWeight = smoothstep(
    clamp01((zone - zoneThreshold) / (ISLET_PRACTICAL_MAX - zoneThreshold))
  );
  const rock = band.fine(point);
  if (rock <= ISLET_ROCK_LEVEL) {
    return 0;
  }
  const rockWeight = smoothstep(
    clamp01((rock - ISLET_ROCK_LEVEL) / (ISLET_PRACTICAL_MAX - ISLET_ROCK_LEVEL))
  );
  return ISLET_BUMP_METERS * zoneWeight * rockWeight;
}

/**
 * Physical-scale smoothing: each cell is averaged over its forms' radius in
 * cells, read from an integral image, so the coastline stays smooth at any
 * sampling density.
 */
function smoothUplift(
  uplift: Float32Array,
  radiusCells: Int32Array,
  width: number,
  height: number,
  passes: number
): void {
  let source: Float32Array = uplift;
  let target: Float32Array = new Float32Array(uplift.length);
  for (let pass = 0; pass < passes; pass++) {
    const integral = buildIntegral(source, width, height);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const index = y * width + x;
        const radius = radiusCells[index] ?? 1;
        const left = Math.max(0, x - radius);
        const right = Math.min(width - 1, x + radius);
        const top = Math.max(0, y - radius);
        const bottom = Math.min(height - 1, y + radius);
        const area = (right - left + 1) * (bottom - top + 1);
        target[index] = windowSum(integral, width, left, top, right, bottom) / area;
      }
    }
    const swap = source;
    source = target;
    target = swap;
  }
  if (source !== uplift) {
    uplift.set(source);
  }
}

function buildIntegral(source: Float32Array, width: number, height: number): Float64Array {
  const stride = width + 1;
  const integral = new Float64Array(stride * (height + 1));
  for (let y = 0; y < height; y++) {
    let rowSum = 0;
    for (let x = 0; x < width; x++) {
      rowSum += source[y * width + x] ?? 0;
      integral[(y + 1) * stride + x + 1] = (integral[y * stride + x + 1] ?? 0) + rowSum;
    }
  }
  return integral;
}

function windowSum(
  integral: Float64Array,
  width: number,
  left: number,
  top: number,
  right: number,
  bottom: number
): number {
  const stride = width + 1;
  return (
    (integral[(bottom + 1) * stride + right + 1] ?? 0) -
    (integral[top * stride + right + 1] ?? 0) -
    (integral[(bottom + 1) * stride + left] ?? 0) +
    (integral[top * stride + left] ?? 0)
  );
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}
