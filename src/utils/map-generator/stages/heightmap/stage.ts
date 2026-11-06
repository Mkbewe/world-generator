import { isHeightmapConfig } from './config/heightmap-check';
import { type RegionShape } from './config/region-shape';
import { regionShapeFor } from './config/region-shape-variants';
import { createHeightmapNoiseBands } from './bands';
import { DEFAULT_HEIGHTMAP_CONFIG } from './defaults';
import { buildHeightField } from './field';
import { GenerationCancelledError } from '../../errors';
import type { MapContext } from '../../pipeline/context';
import { assertStageOutput, type MapStage } from '../../pipeline/stage';
import { HEIGHTMAP_STAGE, type PipelineStageId } from '../../pipeline/stage-definitions';
import { spaceOf } from '../../space';
import type {
  MapConfig,
  MapState,
  StageMetrics,
  StageProgressReporter,
  WorldPoint,
} from '../../types';
import { DEFAULT_BASE_CLIMATE_CONFIG } from '../base-climate';
import { isGeologyPlan } from '../geology';
import { createThermalAt } from '../geology/thermal';

/**
 * Turns the geology plan into one continuous height field in metres: seeded
 * island forms per region are stamped over their bounding boxes, then blended
 * into open ocean, shelf and land around the waterline of 0 m. Heights, water,
 * land and islets all come from this one stage; the land labels belong to the
 * analysis, not to a separate stage.
 */
export class HeightmapStage implements MapStage<
  MapConfig,
  MapState,
  PipelineStageId,
  { heightmap: Float32Array; provenanceMap: Int16Array }
> {
  readonly id: PipelineStageId = HEIGHTMAP_STAGE.id;
  readonly name = HEIGHTMAP_STAGE.name;
  readonly configKeys = HEIGHTMAP_STAGE.configKeys;
  readonly reads: readonly (keyof MapState)[] = ['worldMask', 'geologyPlan', 'heatZoneMap'];
  readonly writes = ['heightmap', 'provenanceMap'] as const;
  readonly progressStep = 0.1;

  async execute(
    context: MapContext<MapConfig, MapState, PipelineStageId>,
    signal: AbortSignal,
    report: StageProgressReporter
  ): Promise<{ heightmap: Float32Array; provenanceMap: Int16Array }> {
    const { sampleWidth, sampleHeight } = context.config.world.dimensions;
    const worldMask = context.state.worldMask;
    const plan = context.state.geologyPlan;

    const config = context.config.heightmap ?? DEFAULT_HEIGHTMAP_CONFIG;
    if (!isHeightmapConfig(config)) {
      throw new RangeError('Heightmap settings are outside their limits.');
    }
    if (!worldMask || worldMask.length !== sampleWidth * sampleHeight) {
      throw new Error('A valid world mask must be generated before the heightmap.');
    }
    if (!plan || !isGeologyPlan(plan)) {
      throw new Error('A geology plan must be generated before the heightmap.');
    }
    if (signal.aborted) {
      throw new GenerationCancelledError();
    }

    report(0.02);
    const dimensions = context.config.world.dimensions;
    const bands = createHeightmapNoiseBands(context.random, dimensions);
    const regionBands = plan.regions.map(region =>
      createHeightmapNoiseBands(context.random, dimensions, `heightmap.${region.id}`)
    );
    const baseClimate = context.config.baseClimate ?? DEFAULT_BASE_CLIMATE_CONFIG;
    const heatZoneMap = context.state.heatZoneMap;
    if (!heatZoneMap || heatZoneMap.length !== sampleWidth * sampleHeight) {
      throw new Error('A valid heat-zone map must be generated before the heightmap.');
    }
    const space = spaceOf(context);
    const thermalAt = createThermalAt(
      heatZoneMap,
      baseClimate.zones.map(zone => zone.thermal),
      space
    );
    const regionShapes = plan.regions.map(region =>
      regionShapeFor(region.type, region.thermal, baseClimate.geologyCoupling)
    );
    const shapeCache = new Map<string, RegionShape>();
    plan.regions.forEach((region, index) => {
      const shape = regionShapes[index];
      if (shape) {
        shapeCache.set(`${index}:${region.thermal}`, shape);
      }
    });
    const shapeAt = (regionIndex: number, point: WorldPoint) => {
      const region = plan.regions[regionIndex];
      if (!region) {
        throw new Error('A form must reference a planned region.');
      }
      const thermal = thermalAt(point);
      const key = `${regionIndex}:${thermal}`;
      const cached = shapeCache.get(key);
      if (cached) {
        return cached;
      }
      const shape = regionShapeFor(region.type, thermal, baseClimate.geologyCoupling);
      shapeCache.set(key, shape);
      return shape;
    };
    const { heightmap, provenanceMap } = buildHeightField({
      plan,
      bands,
      regionBands,
      regionShapes,
      shapeAt,
      random: context.random,
      worldMask,
      dimensions,
      space,
      config,
      signal,
      report: progress => report(0.02 + progress * 0.97),
    });

    if (signal.aborted) {
      throw new GenerationCancelledError();
    }
    report(1);
    return { heightmap, provenanceMap };
  }

  validate(state: Readonly<MapState>, config: Readonly<MapConfig>): void {
    const { sampleWidth, sampleHeight } = config.world.dimensions;
    const cells = sampleWidth * sampleHeight;
    const heightmap = state.heightmap;
    const provenanceMap = state.provenanceMap;
    if (!state.worldMask || !heightmap || !provenanceMap || !isGeologyPlan(state.geologyPlan)) {
      throw new Error('Pipeline completed without all required map data.');
    }
    assertStageOutput(heightmap, 'float32', cells);
    assertStageOutput(provenanceMap, 'int16', cells);
    for (const value of heightmap) {
      if (!Number.isFinite(value)) {
        throw new Error('Heightmap contains an invalid height.');
      }
    }
  }

  summarize(
    context: MapContext<MapConfig, MapState, PipelineStageId>,
    data: { heightmap: Float32Array; provenanceMap: Int16Array }
  ): StageMetrics | undefined {
    const { heightmap, provenanceMap } = data;
    const worldMask = context.state.worldMask;
    let min = Infinity;
    let max = -Infinity;
    let sum = 0;
    let sumSquares = 0;
    let samples = 0;
    let land = 0;

    for (let index = 0; index < heightmap.length; index++) {
      if (worldMask && worldMask[index] === 0) {
        continue;
      }
      const value = heightmap[index];
      samples++;
      min = Math.min(min, value);
      max = Math.max(max, value);
      sum += value;
      sumSquares += value * value;
      if (value > 0) {
        land++;
      }
    }
    if (samples === 0) {
      return undefined;
    }

    const mean = sum / samples;
    const variance = Math.max(0, sumSquares / samples - mean * mean);
    const regions = context.state.geologyPlan?.regions.length ?? 0;
    return {
      min,
      max,
      mean,
      stdDev: Math.sqrt(variance),
      landShare: land / samples,
      regions,
      bytes: heightmap.byteLength + provenanceMap.byteLength,
    };
  }
}
