import { buildTemperatureMap } from './temperature';
import { GenerationCancelledError } from '../../errors';
import type { MapContext } from '../../pipeline/context';
import { assertStageOutput, type MapStage } from '../../pipeline/stage';
import { CLIMATE_STAGE, type PipelineStageId } from '../../pipeline/stage-definitions';
import { spaceOf } from '../../space';
import type { MapConfig, MapState, StageMetrics, StageProgressReporter } from '../../types';
import { isBaseClimateConfig } from '../base-climate/config/base-climate-check';
import { DEFAULT_BASE_CLIMATE_CONFIG } from '../base-climate/defaults';

const PROGRESS_STEP = 0.1;

type ClimateOutput = {
  temperatureMap: Float32Array;
};

export class ClimateStage implements MapStage<MapConfig, MapState, PipelineStageId, ClimateOutput> {
  readonly id: PipelineStageId = CLIMATE_STAGE.id;
  readonly nameKey = CLIMATE_STAGE.nameKey;
  readonly configKeys = CLIMATE_STAGE.configKeys;
  readonly reads: readonly (keyof MapState)[] = [
    'worldMask',
    'heatZoneMap',
    'heightmap',
    'oceanCurrentStrength',
  ];
  readonly writes = ['temperatureMap'] as const;
  readonly progressStep = PROGRESS_STEP;

  async execute(
    context: MapContext<MapConfig, MapState, PipelineStageId>,
    signal: AbortSignal,
    report: StageProgressReporter
  ): Promise<ClimateOutput> {
    const { sampleWidth, sampleHeight } = context.config.world.dimensions;
    const cells = sampleWidth * sampleHeight;
    const worldMask = context.state.worldMask;
    const heatZoneMap = context.state.heatZoneMap;
    const heightmap = context.state.heightmap;
    const oceanCurrentStrength = context.state.oceanCurrentStrength;
    if (!worldMask || worldMask.length !== cells) {
      throw new Error('A valid world mask must be generated before Climate.');
    }
    if (!heatZoneMap || heatZoneMap.length !== cells) {
      throw new Error('A valid heat-zone map must be generated before Climate.');
    }
    if (!heightmap || heightmap.length !== cells) {
      throw new Error('A valid heightmap must be generated before Climate.');
    }
    if (!oceanCurrentStrength || oceanCurrentStrength.length !== cells) {
      throw new Error('A valid ocean-current field must be generated before Climate.');
    }
    if (signal.aborted) {
      throw new GenerationCancelledError();
    }

    const baseClimate = context.config.baseClimate ?? DEFAULT_BASE_CLIMATE_CONFIG;
    if (!isBaseClimateConfig(baseClimate)) {
      throw new RangeError('BaseClimate settings are outside their limits.');
    }
    const temperatureMap = buildTemperatureMap({
      worldMask,
      heatZoneMap,
      heightmap,
      oceanCurrentStrength,
      zones: baseClimate.zones,
      dimensions: context.config.world.dimensions,
      space: spaceOf(context),
      random: context.random,
      signal,
      report,
    });
    return { temperatureMap };
  }

  validate(state: Readonly<MapState>, config: Readonly<MapConfig>): void {
    const { sampleWidth, sampleHeight } = config.world.dimensions;
    const cells = sampleWidth * sampleHeight;
    const worldMask = state.worldMask;
    const temperatureMap = state.temperatureMap;
    if (!worldMask || !temperatureMap) {
      throw new Error('Pipeline completed without all required map data.');
    }
    assertStageOutput(temperatureMap, 'float32', cells);
    for (let index = 0; index < cells; index++) {
      const temperature = temperatureMap[index];
      if (!Number.isFinite(temperature)) {
        throw new Error('Temperature map contains an invalid value.');
      }
      if (worldMask[index] === 0) {
        if (temperature !== 0) {
          throw new Error('Temperature map contains a value outside the world.');
        }
        continue;
      }
      if (temperature < 0 || temperature > 1) {
        throw new Error('Temperature map contains a value outside 0..1.');
      }
    }
  }

  summarize(
    context: MapContext<MapConfig, MapState, PipelineStageId>,
    data: ClimateOutput
  ): StageMetrics | undefined {
    const worldMask = context.state.worldMask;
    let min = Infinity;
    let max = -Infinity;
    let sum = 0;
    let sumSquares = 0;
    let samples = 0;
    for (let index = 0; index < data.temperatureMap.length; index++) {
      if (worldMask && worldMask[index] === 0) {
        continue;
      }
      const temperature = data.temperatureMap[index];
      min = Math.min(min, temperature);
      max = Math.max(max, temperature);
      sum += temperature;
      sumSquares += temperature * temperature;
      samples++;
    }
    if (samples === 0) {
      return undefined;
    }
    const mean = sum / samples;
    return {
      temperatureMin: min,
      temperatureMax: max,
      temperatureMean: mean,
      temperatureStdDev: Math.sqrt(Math.max(0, sumSquares / samples - mean * mean)),
      bytes: data.temperatureMap.byteLength,
    };
  }
}
