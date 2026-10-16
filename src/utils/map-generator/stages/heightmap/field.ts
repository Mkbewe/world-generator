import {
  composeSurfaces,
  measureShoreDistance,
  SHELF_SHORE_WORLD_SHARE,
  textureLand,
} from './relief/compose';
import {
  collectForms,
  effectiveBorderDistances,
  smoothUplift,
  stampForms,
} from './relief/stamping';
import type { HeightmapNoiseBands } from './bands';
import { FIELD_SMOOTH_PASSES, PROVENANCE_OUTSIDE } from './defaults';
import { landAmplitudeMeters } from './fields';
import type { WorldDimensions } from '../../../world-dimensions';
import type { RandomFactory } from '../../random';
import type { WorldSpace } from '../../space';
import type { GeologyPlan, HeightmapConfig } from '../../types';
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

/** Mutable scratch of one build; forms and stamps fill it, the mix reads it. */
export interface FieldContext {
  readonly plan: GeologyPlan;
  readonly bands: HeightmapNoiseBands;
  readonly regionBands: readonly HeightmapNoiseBands[];
  readonly ownerMap: Int16Array;
  readonly borderDistanceMap: Float32Array;
  readonly worldMask: Uint8Array;
  readonly dimensions: WorldDimensions;
  readonly space: WorldSpace;
  readonly config: HeightmapConfig;
  /** Positive land heights, >= 0; smoothing touches only this buffer. */
  readonly landUplift: Float32Array;
  /** Negative water cuts: lagoon floors, reef passes and fjord channels, <= 0. */
  readonly cavityDepth: Float32Array;
  readonly shelfWeight: Float32Array;
  /** Distance to the nearest land, in metres; 0 on land itself. */
  readonly distanceToShore: Float32Array;
  /** Width of the guaranteed shallow belt every shore carries, in metres. */
  readonly shoreWidthMeters: number;
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
    borderDistanceMap: effectiveBorderDistances(borderDistanceMap, worldMask, space, dimensions),
    worldMask,
    dimensions,
    space,
    config,
    landUplift: new Float32Array(cells),
    cavityDepth: new Float32Array(cells),
    shelfWeight: new Float32Array(cells),
    distanceToShore: new Float32Array(cells),
    shoreWidthMeters: worldSize * SHELF_SHORE_WORLD_SHARE,
    radiusCells: new Int32Array(cells),
    cellMeters: dimensions.widthMeters / space.sampleWidth,
    signal: input.signal,
    report: input.report,
  };

  const forms = collectForms(context, random, amplitude);
  stampForms(context, forms);
  smoothUplift(
    context.landUplift,
    context.radiusCells,
    space.sampleWidth,
    space.sampleHeight,
    FIELD_SMOOTH_PASSES
  );
  context.distanceToShore.set(
    measureShoreDistance(context.landUplift, dimensions, context.cellMeters)
  );
  textureLand(context);
  composeSurfaces(context, heightmap, provenanceMap);
  return { heightmap, provenanceMap };
}
