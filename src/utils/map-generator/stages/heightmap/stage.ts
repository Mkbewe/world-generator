import { createHeightmapNoiseBands } from './bands';
import { DEFAULT_HEIGHTMAP_CONFIG, MAX_RELIEF, MIN_RELIEF } from './defaults';
import { buildHeightField } from './field';
import { isHeightmapConfig } from './heightmap-check';
import { GenerationCancelledError } from '../../errors';
import type { MapContext } from '../../pipeline/context';
import { assertStageOutput, type MapStage } from '../../pipeline/stage';
import { HEIGHTMAP_STAGE, type PipelineStageId } from '../../pipeline/stage-definitions';
import { spaceOf } from '../../space';
import type { MapConfig, MapState, StageMetrics, StageProgressReporter } from '../../types';
import { isGeologyPlan } from '../geology';

/**
 * Turns the geology plan into one continuous heightfield: an area's seabed
 * offset, its uplift potential and its local relief merge into one value per
 * cell, with the diagnostic provenance beside it. The land and water split,
 * islands and bathymetry labels belong to a later stage.
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
  readonly reads: readonly (keyof MapState)[] = ['worldMask', 'geologyPlan'];
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
      throw new RangeError(`Heightmap relief must be between ${MIN_RELIEF} and ${MAX_RELIEF}.`);
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
    const bands = createHeightmapNoiseBands(context.random, context.config.world.dimensions);
    const { heightmap, provenanceMap } = buildHeightField({
      plan,
      bands,
      worldMask,
      dimensions: context.config.world.dimensions,
      space: spaceOf(context),
      relief: config.relief,
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
        throw new Error('Heightmap contains a non-finite height.');
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
    const areas = context.state.geologyPlan?.areas.length ?? 0;
    return {
      min,
      max,
      mean,
      stdDev: Math.sqrt(variance),
      landShare: land / samples,
      areas,
      bytes: heightmap.byteLength + provenanceMap.byteLength,
    };
  }
}
