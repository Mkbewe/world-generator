import { isBaseClimateConfig } from './config/base-climate-check';
import { DEFAULT_BASE_CLIMATE_CONFIG } from './defaults';
import { createBaseMoistureBand, moistureValue } from './moisture';
import { createHeatZoneSampler } from './sampler';
import { GenerationCancelledError } from '../../errors';
import type { MapContext } from '../../pipeline/context';
import { assertStageOutput, type MapStage } from '../../pipeline/stage';
import { BASE_CLIMATE_STAGE, type PipelineStageId } from '../../pipeline/stage-definitions';
import { spaceOf } from '../../space';
import type {
  BaseClimateConfig,
  HeatZoneClass,
  MapConfig,
  MapState,
  StageMetrics,
  StageProgressReporter,
} from '../../types';

const PROGRESS_STEP = 0.1;

export class BaseClimateStage implements MapStage<
  MapConfig,
  MapState,
  PipelineStageId,
  { heatZoneMap: Int16Array; moistureBaseMap: Float32Array }
> {
  readonly id: PipelineStageId = BASE_CLIMATE_STAGE.id;
  readonly name = BASE_CLIMATE_STAGE.name;
  readonly configKeys = BASE_CLIMATE_STAGE.configKeys;
  readonly reads: readonly (keyof MapState)[] = ['worldMask'];
  readonly writes = ['heatZoneMap', 'moistureBaseMap'] as const;
  readonly progressStep = PROGRESS_STEP;

  async execute(
    context: MapContext<MapConfig, MapState, PipelineStageId>,
    signal: AbortSignal,
    report: StageProgressReporter
  ): Promise<{ heatZoneMap: Int16Array; moistureBaseMap: Float32Array }> {
    const dimensions = context.config.world.dimensions;
    const { sampleWidth, sampleHeight } = dimensions;
    const cells = sampleWidth * sampleHeight;
    const config = context.config.baseClimate ?? DEFAULT_BASE_CLIMATE_CONFIG;
    if (!isBaseClimateConfig(config)) {
      throw new RangeError('Heat-zone settings are outside their limits.');
    }

    const worldMask = context.state.worldMask;
    if (!worldMask || worldMask.length !== cells) {
      throw new Error('A valid world mask must be generated before heat zones.');
    }
    if (signal.aborted) {
      throw new GenerationCancelledError();
    }

    const space = spaceOf(context);
    const zoneAt = createHeatZoneSampler(config.zones, (left, right) =>
      space.distance(left, right)
    );
    const moistureBand = createBaseMoistureBand(context.random, dimensions);
    const heatZoneMap = new Int16Array(cells);
    heatZoneMap.fill(-1);
    const moistureBaseMap = new Float32Array(cells);

    for (let y = 0; y < sampleHeight; y++) {
      if (signal.aborted) {
        throw new GenerationCancelledError();
      }

      for (let x = 0; x < sampleWidth; x++) {
        const cell = y * sampleWidth + x;
        if (worldMask[cell] === 0) {
          continue;
        }
        const point = space.cellToNormalized(x, y);
        heatZoneMap[cell] = zoneAt(point);
        moistureBaseMap[cell] = moistureValue(moistureBand, point);
      }

      report((y + 1) / sampleHeight);
    }

    report(1);
    return { heatZoneMap, moistureBaseMap };
  }

  validate(state: Readonly<MapState>, config: Readonly<MapConfig>): void {
    const { sampleWidth, sampleHeight } = config.world.dimensions;
    const cells = sampleWidth * sampleHeight;
    const baseClimate = config.baseClimate ?? DEFAULT_BASE_CLIMATE_CONFIG;
    const worldMask = state.worldMask;
    const heatZoneMap = state.heatZoneMap;
    const moistureBaseMap = state.moistureBaseMap;
    assertStageOutput(heatZoneMap, 'int16', cells);
    assertStageOutput(moistureBaseMap, 'float32', cells);
    if (!worldMask || worldMask.length !== cells || !heatZoneMap || !moistureBaseMap) {
      throw new Error('Pipeline completed without all required map data.');
    }

    for (let index = 0; index < cells; index++) {
      const zone = heatZoneMap[index];
      const moisture = moistureBaseMap[index];
      if (!Number.isFinite(moisture) || moisture < 0 || moisture > 1) {
        throw new Error('Base moisture map contains an invalid value.');
      }
      if (worldMask[index] === 0) {
        if (zone !== -1) {
          throw new Error('Heat-zone map contains a zone outside the world.');
        }
        continue;
      }
      if (!Number.isInteger(zone) || zone < 0 || zone >= baseClimate.zones.length) {
        throw new Error('Heat-zone map contains an invalid zone index.');
      }
    }
  }

  summarize(
    context: MapContext<MapConfig, MapState, PipelineStageId>,
    data: { heatZoneMap: Int16Array; moistureBaseMap: Float32Array }
  ): StageMetrics | undefined {
    const baseClimate = context.config.baseClimate ?? DEFAULT_BASE_CLIMATE_CONFIG;
    const worldMask = context.state.worldMask;
    const counts = new Uint32Array(baseClimate.zones.length);
    let covered = 0;
    let moistureSum = 0;
    let moistureSumSquares = 0;
    let moistureMin = Infinity;
    let moistureMax = -Infinity;

    for (let index = 0; index < data.heatZoneMap.length; index++) {
      if (worldMask && worldMask[index] === 0) {
        continue;
      }
      const zone = data.heatZoneMap[index];
      if (zone !== undefined && zone >= 0) {
        counts[zone] += 1;
      }
      const moisture = data.moistureBaseMap[index];
      if (moisture === undefined) {
        continue;
      }
      covered++;
      moistureSum += moisture;
      moistureSumSquares += moisture * moisture;
      moistureMin = Math.min(moistureMin, moisture);
      moistureMax = Math.max(moistureMax, moisture);
    }
    if (covered === 0) {
      return undefined;
    }

    const shares = sharesByThermalClass(baseClimate, counts, covered);
    const mean = moistureSum / covered;
    return {
      zones: baseClimate.zones.length,
      coveredCells: covered,
      coldShare: shares.cold,
      temperateShare: shares.temperate,
      warmShare: shares.warm,
      moistureMin,
      moistureMax,
      moistureMean: mean,
      moistureStdDev: Math.sqrt(Math.max(0, moistureSumSquares / covered - mean * mean)),
      bytes: data.heatZoneMap.byteLength + data.moistureBaseMap.byteLength,
    };
  }
}

function sharesByThermalClass(
  baseClimate: BaseClimateConfig,
  counts: Uint32Array,
  covered: number
): Readonly<Record<HeatZoneClass, number>> {
  const totals: Record<HeatZoneClass, number> = { cold: 0, temperate: 0, warm: 0 };
  for (const [index, zone] of baseClimate.zones.entries()) {
    totals[zone.thermal] += counts[index];
  }
  return {
    cold: totals.cold / covered,
    temperate: totals.temperate / covered,
    warm: totals.warm / covered,
  };
}
