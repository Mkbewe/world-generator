import { createHeightmapNoiseBands } from './bands';
import { buildHeightmap, OUTSIDE_SHELF } from './build';
import { DEFAULT_HEIGHTMAP_CONFIG, MAX_RELIEF, MIN_RELIEF } from './defaults';
import { isHeightmapConfig } from './heightmap-check';
import { GenerationCancelledError } from '../../errors';
import type { MapContext } from '../../pipeline/context';
import { assertStageOutput, type MapStage } from '../../pipeline/stage';
import { HEIGHTMAP_STAGE, type PipelineStageId } from '../../pipeline/stage-definitions';
import { spaceOf } from '../../space';
import type {
  CharacterZone,
  HeightmapConfig,
  LandmassLayout,
  MapConfig,
  MapState,
  StageMetrics,
  StageProgressReporter,
} from '../../types';
import { isLandmassLayout } from '../landmass';
import { isStructureZones } from '../structure-character';

/**
 * Turns the landmass layout and its character zones into one continuous height:
 * land above the sea datum, a shelf band below it and the flat ocean floor. The
 * land and water split, islands and bathymetry labels belong to a later stage.
 */
export class HeightmapStage implements MapStage<
  MapConfig,
  MapState,
  PipelineStageId,
  { heightmap: Float32Array; shelfIndexMap: Int16Array }
> {
  readonly id: PipelineStageId = HEIGHTMAP_STAGE.id;
  readonly name = HEIGHTMAP_STAGE.name;
  readonly configKeys = HEIGHTMAP_STAGE.configKeys;
  readonly reads: readonly (keyof MapState)[] = ['worldMask', 'landmassLayout', 'structureZones'];
  readonly writes = ['heightmap', 'shelfIndexMap'] as const;
  readonly progressStep = 0.1;

  async execute(
    context: MapContext<MapConfig, MapState, PipelineStageId>,
    signal: AbortSignal,
    report: StageProgressReporter
  ): Promise<{ heightmap: Float32Array; shelfIndexMap: Int16Array }> {
    const { sampleWidth, sampleHeight } = context.config.world.dimensions;
    const worldMask = context.state.worldMask;
    const layout = context.state.landmassLayout;
    const zones = context.state.structureZones;

    const config = context.config.heightmap ?? DEFAULT_HEIGHTMAP_CONFIG;
    this.validateConfig(config, layout, zones);
    if (!worldMask || worldMask.length !== sampleWidth * sampleHeight) {
      throw new Error('A valid world mask must be generated before the heightmap.');
    }
    if (!layout || !zones) {
      throw new Error(
        'A landmass layout and structure zones must be generated before the heightmap.'
      );
    }
    if (signal.aborted) {
      throw new GenerationCancelledError();
    }

    report(0.02);
    const bands = createHeightmapNoiseBands(context.random, context.config.world.dimensions);
    const { heightmap, shelfIndexMap } = buildHeightmap({
      layout,
      zones,
      bands,
      worldMask,
      config,
      worldSizeMeters: Math.max(
        context.config.world.dimensions.widthMeters,
        context.config.world.dimensions.heightMeters
      ),
      space: spaceOf(context),
      signal,
      report: progress => report(0.02 + progress * 0.97),
    });

    if (signal.aborted) {
      throw new GenerationCancelledError();
    }
    report(1);
    return { heightmap, shelfIndexMap };
  }

  validate(state: Readonly<MapState>, config: Readonly<MapConfig>): void {
    const { sampleWidth, sampleHeight } = config.world.dimensions;
    const cells = sampleWidth * sampleHeight;
    const heightmap = state.heightmap;
    const shelfIndexMap = state.shelfIndexMap;
    if (
      !state.worldMask ||
      !heightmap ||
      !shelfIndexMap ||
      !isLandmassLayout(state.landmassLayout) ||
      !isStructureZones(state.structureZones)
    ) {
      throw new Error('Pipeline completed without all required map data.');
    }
    assertStageOutput(heightmap, 'float32', cells);
    assertStageOutput(shelfIndexMap, 'int16', cells);
    for (const value of heightmap) {
      if (!Number.isFinite(value)) {
        throw new Error('Heightmap contains a non-finite height.');
      }
    }
  }

  summarize(
    context: MapContext<MapConfig, MapState, PipelineStageId>,
    data: { heightmap: Float32Array; shelfIndexMap: Int16Array }
  ): StageMetrics | undefined {
    const { heightmap, shelfIndexMap } = data;
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
    const shelves = new Set<number>();
    for (const value of shelfIndexMap) {
      if (value !== OUTSIDE_SHELF) {
        shelves.add(value);
      }
    }
    return {
      min,
      max,
      mean,
      stdDev: Math.sqrt(variance),
      landShare: land / samples,
      shelves: shelves.size,
      bytes: heightmap.byteLength + shelfIndexMap.byteLength,
    };
  }

  private validateConfig(
    config: HeightmapConfig,
    layout: LandmassLayout | undefined,
    zones: readonly CharacterZone[] | undefined
  ): void {
    if (!isHeightmapConfig(config)) {
      throw new RangeError(
        `Heightmap relief and feature scale must be between ${MIN_RELIEF} and ${MAX_RELIEF}.`
      );
    }
    if (!isLandmassLayout(layout)) {
      throw new Error('A landmass layout must be generated before the heightmap.');
    }
    if (!isStructureZones(zones)) {
      throw new Error('Structure zones must be generated before the heightmap.');
    }
  }
}
