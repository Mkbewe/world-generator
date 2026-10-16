import {
  cliffinessAt,
  formProfile,
  modulatedRadial,
  type ProfileInput,
  type SampleInput,
} from './profiles';
import { gridDistanceTransform } from '../../../../grid-distance';
import { smoothstep } from '../../../../math';
import type { WorldDimensions } from '../../../../world-dimensions';
import { GenerationCancelledError } from '../../../errors';
import type { RandomFactory } from '../../../random';
import type { WorldSpace } from '../../../space';
import type { WorldPoint } from '../../../types';
import type { HeightmapNoiseBands } from '../bands';
import { REGION_SHAPES, type RegionShape } from '../config/region-shape';
import { defaultRegionTerrain } from '../config/region-terrain';
import { FIELD_SMOOTH_SHARE, HILL_WARP_SHARE } from '../defaults';
import type { FieldContext } from '../field';
import { buildRegionForms, collectRegionInteriors, type IslandForm } from '../forms/forms';

/** How strongly overlapping lobes merge instead of summing into spikes. */
const LOBE_MERGE_SHARE = 0.3;
/** Sum of every lobe share at its maximum; sizes the stamping bounding box. */
const LOBE_REACH_SHARE = 1.32;
/** Share of the shelf a sheer coast takes away, so deep water hugs the wall. */
const SHELF_CLIFF_SHARE = 0.7;
/** Water descent from the shore to the deep floor spans at least this share
 * of the island radius, so the light water fades instead of stepping. */
const WATER_MIN_SPAN = 0.35;
/** Plain islands hold their shore water shallow over this eased part of the
 * descent: a coastal shelf, smaller than a reef bank. */
const PLAIN_SHELF_EASE = 0.5;
/** Share of the water span that keeps full shore shallowness before the
 * descent starts; sheer coasts skip it so deep water hugs the wall. */
const SHELF_HOLD_SHARE = 0.3;
/** How strongly overlapping shelves lift into one shared bank. */
const SHELF_MERGE_SHARE = 0.3;

/**
 * Border map of the stage: the owner distance alone ignores the world rim,
 * where nothing borders another region, so islands would anchor and land
 * would survive at the very edge of the mask. The rim and the raster frame
 * join the map through the shared chamfer transform, as a synthetic barrier
 * region, so both distances use one algorithm and one step set.
 */
export function effectiveBorderDistances(
  regionBorderDistanceMap: Float32Array,
  worldMask: Uint8Array,
  space: WorldSpace,
  dimensions: WorldDimensions
): Float32Array {
  const width = dimensions.sampleWidth;
  const height = dimensions.sampleHeight;
  const origin = space.cellToNormalized(0, 0);
  const stepX = space.distanceMeters(space.cellToNormalized(1, 0), origin);
  const stepY = space.distanceMeters(space.cellToNormalized(0, 1), origin);
  const diagonal = space.distanceMeters(space.cellToNormalized(1, 1), origin);
  const owner = new Int16Array(worldMask.length);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = y * width + x;
      if (worldMask[index] === 0) {
        owner[index] = -1;
        continue;
      }
      owner[index] = isWorldEdgeCell(worldMask, width, height, x, y) ? 1 : 0;
    }
  }
  const edge = gridDistanceTransform(owner, width, height, {
    borderDistance: 0.5 * stepX,
    farDistance: Infinity,
    stepX,
    stepY,
    diagonal,
  });
  const effective = new Float32Array(worldMask.length);
  for (let index = 0; index < effective.length; index++) {
    effective[index] =
      worldMask[index] === 0
        ? (regionBorderDistanceMap[index] ?? 0)
        : Math.min(regionBorderDistanceMap[index] ?? 0, edge[index] ?? 0);
  }
  return effective;
}

/** Whether a cell sits on the raster frame or touches the world mask edge. */
function isWorldEdgeCell(
  worldMask: Uint8Array,
  width: number,
  height: number,
  x: number,
  y: number
): boolean {
  if (x === 0 || y === 0 || x === width - 1 || y === height - 1) {
    return true;
  }
  const index = y * width + x;
  return (
    worldMask[index - 1] === 0 ||
    worldMask[index + 1] === 0 ||
    worldMask[index - width] === 0 ||
    worldMask[index + width] === 0
  );
}

/** One form list per region: seeds, sizes and spacing all seeded per region. */
export function collectForms(
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
export function stampForms(context: FieldContext, forms: readonly IslandForm[]): void {
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
    form.shelfRadiusMeters *
    Math.sqrt(form.aspect) *
    (1 + HILL_WARP_SHARE * shape.warpFactor + shape.warpFactor * LOBE_REACH_SHARE);
  const minCell = space.normalizedToCell(
    form.centre.x - boundMeters / dimensions.widthMeters,
    form.centre.y - boundMeters / dimensions.heightMeters
  );
  const maxCell = space.normalizedToCell(
    form.centre.x + boundMeters / dimensions.widthMeters,
    form.centre.y + boundMeters / dimensions.heightMeters
  );
  const radius = smoothRadiusCells(form.radiusMeters, age, context.cellMeters);
  // The form carries its own shelf span: a reef ring sits on a wide bank,
  // a solid island keeps only a narrow one.
  const shelfFactor = form.shelfRadiusMeters / form.radiusMeters;
  // The summit lives in the same transformed frame as every sampled point;
  // one transform per form keeps the profile loop free of trigonometry.
  const warpedPeak = applyAspect(form.peak, form, dimensions);
  for (let y = minCell.y; y <= maxCell.y; y++) {
    for (let x = minCell.x; x <= maxCell.x; x++) {
      const index = y * space.sampleWidth + x;
      if (worldMask[index] === 0 || ownerMap[index] !== form.regionIndex) {
        continue;
      }
      const point = space.cellToNormalized(x, y);
      const warped = warpPoint(point, form, band, shape, dimensions);
      const distMeters = space.distanceMeters(warped, form.centre);
      const sampleInput: SampleInput = {
        form,
        shape,
        band,
        point,
        warped,
        warpedPeak,
        distMeters,
        age,
        dimensions,
        space,
      };
      const effectiveRadial = modulatedRadial(sampleInput);
      // Bays cut the land outline; their water keeps the shelf of the
      // uncut radial, so a bay fills with shallow water instead of the deep.
      const shelfRadial = Math.min(effectiveRadial, modulatedRadial(sampleInput, false));
      // One sheer-coast measure per cell; the profile reads it from here.
      const profileInput: ProfileInput = {
        ...sampleInput,
        cliffiness: cliffinessAt(sampleInput, effectiveRadial),
      };
      const { cliffiness } = profileInput;
      // The water descent never shrinks below its own floor span, so the
      // shore water fades into the deep instead of stepping down.
      const shelfSpan = Math.max(
        (shelfFactor - 1) * (1 - SHELF_CLIFF_SHARE * cliffiness),
        WATER_MIN_SPAN
      );
      if (shelfRadial > 1 + shelfSpan) {
        continue;
      }
      // A sheer coast keeps its own cell unsmoothed, so the wall stays a
      // wall instead of smearing into a ramp.
      radiusCells[index] = Math.max(radiusCells[index], Math.round(radius * (1 - cliffiness)));
      if (effectiveRadial > 1) {
        shelfWeight[index] = mergeShelf(
          shelfWeight[index],
          shelfWeightAt(form, cliffiness, shelfRadial, shelfSpan)
        );
        continue;
      }
      shelfWeight[index] = 1;
      const sample = formProfile(profileInput, effectiveRadial);
      if (sample.land > 0) {
        mergeUplift(landUplift, index, sample.land);
      }
      if (sample.carve < 0) {
        // A water cut owns the cell: no neighbouring form may fill it with land.
        context.cavityDepth[index] = Math.min(context.cavityDepth[index], sample.carve);
        landUplift[index] = 0;
      }
    }
  }
}

/**
 * Weight of the water shelf at one cell: the shore keeps full shallowness
 * over a hold share of the span — past the smoothed land hem — and only then
 * slides into the deep.
 */
function shelfWeightAt(
  form: IslandForm,
  cliffiness: number,
  shelfRadial: number,
  shelfSpan: number
): number {
  const hold = SHELF_HOLD_SHARE * (1 - cliffiness);
  const t = Math.max(0, (shelfRadial - 1) / Math.max(1e-6, shelfSpan));
  const shelf = clamp01((1 - t) / Math.max(1e-6, 1 - hold));
  const ease = form.hasCavity ? 1 : PLAIN_SHELF_EASE;
  return Math.pow(smoothstep(shelf), ease);
}

/** Overlapping positive forms merge gently into one land mass. */
function mergeUplift(uplift: Float32Array, index: number, land: number): void {
  if (land <= 0) {
    return;
  }
  const previous = uplift[index];
  uplift[index] = Math.max(previous, land) + LOBE_MERGE_SHARE * Math.min(previous, land);
}

/** Overlapping shelves merge gently into one shared bank under the group. */
function mergeShelf(previous: number, shelf: number): number {
  return Math.min(1, Math.max(previous, shelf) + SHELF_MERGE_SHARE * Math.min(previous, shelf));
}

/**
 * The sample point is warped by its region's bands in proportion to the form
 * radius, then stretched across the minor axis: the anisotropic distance of
 * the warped point is the island's footprint. The warp and fine bands bend
 * the coast into bays and peninsulas; the long large wave only shifts the
 * whole mass.
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
    x: point.x + (warpMeters * band.warpX(point)) / dimensions.widthMeters,
    y: point.y + (warpMeters * band.warpY(point)) / dimensions.heightMeters,
  };
  return applyAspect(warped, form, dimensions);
}

function applyAspect(point: WorldPoint, form: IslandForm, dimensions: WorldDimensions): WorldPoint {
  const offsetX = (point.x - form.centre.x) * dimensions.widthMeters;
  const offsetY = (point.y - form.centre.y) * dimensions.heightMeters;
  const cos = Math.cos(form.angleRadians);
  const sin = Math.sin(form.angleRadians);
  const along = cos * offsetX + sin * offsetY;
  const across = -sin * offsetX + cos * offsetY;
  // The stretch scales both axes by the square root of the aspect, so the
  // island area stays the same; bowing the across axis makes crescents.
  const rootAspect = Math.sqrt(form.aspect);
  const scaledAlong = along / rootAspect;
  const normalizedAlong = scaledAlong / Math.max(1, form.radiusMeters);
  const bentAcross = across - form.bend * normalizedAlong * normalizedAlong * form.radiusMeters;
  const scaledAcross = bentAcross * rootAspect;
  return {
    x: form.centre.x + (cos * scaledAlong - sin * scaledAcross) / dimensions.widthMeters,
    y: form.centre.y + (sin * scaledAlong + cos * scaledAcross) / dimensions.heightMeters,
  };
}

/** Older regions smooth farther, which reads as an eroded coastline. */
function smoothRadiusCells(radiusMeters: number, age: number, cellMeters: number): number {
  const ageScale = 0.65 + 0.85 * clamp01(age);
  return Math.max(1, Math.round((radiusMeters * FIELD_SMOOTH_SHARE * ageScale) / cellMeters));
}

/**
 * Physical-scale smoothing: each cell is averaged over its forms' radius in
 * cells, read from an integral image, so the coastline stays smooth at any
 * sampling density.
 */
export function smoothUplift(
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
