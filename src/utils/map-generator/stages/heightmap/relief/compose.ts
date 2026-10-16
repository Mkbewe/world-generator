import { gridDistanceTransform } from '../../../../grid-distance';
import { smoothstep } from '../../../../math';
import type { WorldDimensions } from '../../../../world-dimensions';
import { GenerationCancelledError } from '../../../errors';
import type { WorldPoint } from '../../../types';
import type { HeightmapNoiseBands } from '../bands';
import { REGION_SHAPES, type RegionShape } from '../config/region-shape';
import {
  BORDER_GATE_FADE_METERS,
  BORDER_GATE_METERS,
  BORDER_GATE_WARP_SHARE,
  COAST_DETAIL_SHARE,
  ISLET_BUMP_METERS,
  ISLET_MAX_DEPTH_METERS,
  ISLET_PRACTICAL_MAX,
  ISLET_ROCK_LEVEL,
  ISLET_ZONE_LEVEL,
  ISLET_ZONE_MIN,
  OCEAN_FLOOR_METERS,
  SHELF_DEPTH_METERS,
} from '../defaults';
import type { FieldContext } from '../field';

/** Land this low above the waterline reads as water at the coast. */
const SHORE_METERS = 0.5;
/** How fast the near-shore fringe dips below the waterline instead of
 * staying a flat zero shelf. */
const SHORE_DIP_SHARE = 4;
/** Islets only rise where the gate has faded in past this share. */
const ISLET_GATE_MIN = 0.25;
/** Depth over which an islet bump gathers its whole height, in metres. */
const ISLET_BUMP_DEPTH_METERS = 8;
/** Interior texture fades in over this height above the waterline, in metres. */
const SHORE_FADE_METERS = 8;
/** Water depth right at the shoreline: the shelf never meets land at 0 m. */
const SHORE_WATER_DEPTH_METERS = 3.5;
/** Width of the guaranteed shallow belt every shore carries, as a share of
 * the world size, so small and large worlds keep the same coastal scale. */
export const SHELF_SHORE_WORLD_SHARE = 0.03;

/**
 * Distance from every cell to the nearest land, in metres, through the
 * shared chamfer transform. Water keeps a guaranteed shallow belt by this
 * distance, whatever the island's shape or warp does to the radial.
 */
export function measureShoreDistance(
  landUplift: Float32Array,
  dimensions: WorldDimensions,
  cellMeters: number
): Float32Array {
  const land = new Int16Array(landUplift.length);
  for (let index = 0; index < landUplift.length; index++) {
    land[index] = (landUplift[index] ?? 0) > SHORE_METERS ? 1 : 0;
  }
  return gridDistanceTransform(land, dimensions.sampleWidth, dimensions.sampleHeight, {
    borderDistance: 0,
    farDistance: Infinity,
    stepX: cellMeters,
    stepY: cellMeters,
    diagonal: cellMeters * Math.SQRT2,
  });
}

/** Land texture: fine roughness, coast bends and the ridged crests. */
export function textureLand(context: FieldContext): void {
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
      const shoreFade = smoothstep(clamp01(landUplift[index] / SHORE_FADE_METERS));
      const texture = landTexture(band, point, REGION_SHAPES[region.type]);
      landUplift[index] *= 1 + (texture - 1) * shoreFade;
    }
    context.report?.(0.6 + ((y + 1) / space.sampleHeight) * 0.08);
  }
}

function landTexture(band: HeightmapNoiseBands, point: WorldPoint, shape: RegionShape): number {
  const ridge = band.ridge(point);
  const fine = band.fine(point);
  const crest = 1 - Math.abs(ridge);
  return (
    (1 + shape.modulationShare * fine) *
    (1 + COAST_DETAIL_SHARE * ridge) *
    (1 + shape.ridgeShare * (crest - 0.5))
  );
}

/** Open ocean, shelf and land blended around the fixed waterline of 0 m. */
export function composeSurfaces(
  context: FieldContext,
  heightmap: Float32Array,
  provenanceMap: Int16Array
): void {
  const {
    plan,
    worldMask,
    ownerMap,
    landUplift,
    cavityDepth,
    shelfWeight,
    distanceToShore,
    shoreWidthMeters,
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
      // The region scales its ocean floor depth; the gate fades the scale in
      // so two regions never step against each other at their border.
      const region = plan.regions[ownerMap[index]];
      const floorShare = region ? REGION_SHAPES[region.type].oceanFloorShare : 1;
      const floorScale = 1 - (1 - floorShare) * gate;
      const deepFloor = -OCEAN_FLOOR_METERS * (0.6 + 0.4 * (0.5 - 0.5 * large)) * floorScale;
      // The floor slides linearly from the shore water down to the deep
      // ocean, so the palette fades instead of jumping between blues. Every
      // shore additionally carries a measured shallow belt: inside it the
      // depth blends toward the shore profile, so no coast meets the abyss.
      const base = deepFloor + (-SHORE_WATER_DEPTH_METERS - deepFloor) * shelfWeight[index] * gate;
      const shoreMix = clamp01(distanceToShore[index] / shoreWidthMeters);
      const shoreProfile =
        -SHORE_WATER_DEPTH_METERS - (SHELF_DEPTH_METERS - SHORE_WATER_DEPTH_METERS) * shoreMix;
      const seabed = shoreProfile + (base - shoreProfile) * shoreMix;
      const shaped = gate * landUplift[index];
      const carved = gate * cavityDepth[index];
      let surface = seabed;
      if (carved < 0) {
        surface = seabed + carved;
      } else if (shaped > SHORE_METERS) {
        surface = shaped;
      } else if (shaped > 0) {
        // The fringe below the shoreline dips straight into the water, so
        // no island ends on a flat zero shelf.
        surface = seabed + (shaped - SHORE_METERS) * SHORE_DIP_SHARE;
      }
      if (
        config.isletFrequency > 0 &&
        surface <= 0 &&
        surface > -ISLET_MAX_DEPTH_METERS &&
        gate > ISLET_GATE_MIN
      ) {
        const band = regionBands[ownerMap[index]];
        const isletShape = region ? REGION_SHAPES[region.type] : undefined;
        if (band && isletShape) {
          // The bump is a seamount rising from its floor: past the bump depth
          // it adds its whole height, over a near-zero shelf only a lip. The
          // region's own scale keeps sandy specks sandy.
          surface +=
            isletBump(band, point, config.isletFrequency) *
            clamp01(-surface / ISLET_BUMP_DEPTH_METERS) *
            Math.min(1, isletShape.amplitudeFactor);
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
 * Islets in clusters: the ridge band picks the shoals (sometimes here,
 * sometimes not), the fine band picks the individual rocks inside them.
 */
function isletBump(band: HeightmapNoiseBands, point: WorldPoint, frequency: number): number {
  const zoneThreshold = ISLET_ZONE_LEVEL - (ISLET_ZONE_LEVEL - ISLET_ZONE_MIN) * frequency;
  const zone = band.ridge(point);
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

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}
