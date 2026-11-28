import { buildHydrology } from './hydrology';
import { buildMoistureMap } from './moisture';
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
  moistureMap: Float32Array;
  riverMap: Uint8Array;
  lakeMap: Uint8Array;
  basinMap: Int16Array;
};

export class ClimateStage implements MapStage<MapConfig, MapState, PipelineStageId, ClimateOutput> {
  readonly id: PipelineStageId = CLIMATE_STAGE.id;
  readonly nameKey = CLIMATE_STAGE.nameKey;
  readonly configKeys = CLIMATE_STAGE.configKeys;
  readonly reads: readonly (keyof MapState)[] = [
    'worldMask',
    'heatZoneMap',
    'heightmap',
    'moistureBaseMap',
    'oceanCurrentMap',
    'oceanCurrentStrength',
  ];
  readonly writes = ['temperatureMap', 'moistureMap', 'riverMap', 'lakeMap', 'basinMap'] as const;
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
    const moistureBaseMap = context.state.moistureBaseMap;
    const oceanCurrentMap = context.state.oceanCurrentMap;
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
    if (!moistureBaseMap || moistureBaseMap.length !== cells) {
      throw new Error('A valid base-moisture map must be generated before Climate.');
    }
    if (!oceanCurrentMap || oceanCurrentMap.length !== cells) {
      throw new Error('A valid ocean-current map must be generated before Climate.');
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
    const dimensions = context.config.world.dimensions;
    const space = spaceOf(context);
    const temperatureMap = buildTemperatureMap({
      worldMask,
      heatZoneMap,
      heightmap,
      oceanCurrentStrength,
      zones: baseClimate.zones,
      dimensions,
      space,
      random: context.random,
      signal,
      report: progress => report(progress * 0.4),
    });
    const moistureMap = buildMoistureMap({
      worldMask,
      heightmap,
      moistureBaseMap,
      oceanCurrentMap,
      oceanCurrentStrength,
      zones: baseClimate.moistureZones ?? [],
      dimensions,
      space,
      signal,
      report: progress => report(0.4 + progress * 0.25),
    });
    const { riverMap, lakeMap, basinMap } = buildHydrology({
      worldMask,
      heightmap,
      moistureMap,
      dimensions,
      signal,
      report: progress => report(0.65 + progress * 0.35),
    });
    return { temperatureMap, moistureMap, riverMap, lakeMap, basinMap };
  }

  validate(state: Readonly<MapState>, config: Readonly<MapConfig>): void {
    const { sampleWidth, sampleHeight } = config.world.dimensions;
    const cells = sampleWidth * sampleHeight;
    const worldMask = state.worldMask;
    const temperatureMap = state.temperatureMap;
    const moistureMap = state.moistureMap;
    const riverMap = state.riverMap;
    const lakeMap = state.lakeMap;
    const basinMap = state.basinMap;
    if (!worldMask || !temperatureMap || !moistureMap || !riverMap || !lakeMap || !basinMap) {
      throw new Error('Pipeline completed without all required map data.');
    }
    assertStageOutput(temperatureMap, 'float32', cells);
    assertStageOutput(moistureMap, 'float32', cells);
    assertStageOutput(riverMap, 'uint8', cells);
    assertStageOutput(lakeMap, 'uint8', cells);
    assertStageOutput(basinMap, 'int16', cells);
    for (let index = 0; index < cells; index++) {
      const temperature = temperatureMap[index];
      const moisture = moistureMap[index];
      if (!Number.isFinite(temperature) || !Number.isFinite(moisture)) {
        throw new Error('Climate map contains an invalid value.');
      }
      if (worldMask[index] === 0) {
        if (temperature !== 0 || moisture !== 0) {
          throw new Error('Climate map contains a value outside the world.');
        }
        continue;
      }
      if (temperature < 0 || temperature > 1) {
        throw new Error('Temperature map contains a value outside 0..1.');
      }
      if (moisture < 0 || moisture > 1) {
        throw new Error('Moisture map contains a value outside 0..1.');
      }
      if (basinMap[index] < 0) {
        throw new Error('Basin map contains a negative id.');
      }
    }
  }

  summarize(
    context: MapContext<MapConfig, MapState, PipelineStageId>,
    data: ClimateOutput
  ): StageMetrics | undefined {
    const worldMask = context.state.worldMask;
    let temperatureMin = Infinity;
    let temperatureMax = -Infinity;
    let temperatureSum = 0;
    let temperatureSquares = 0;
    let moistureMin = Infinity;
    let moistureMax = -Infinity;
    let moistureSum = 0;
    let moistureSquares = 0;
    let samples = 0;
    let riverCells = 0;
    let lakeCells = 0;
    let basinCount = 0;

    for (let index = 0; index < data.temperatureMap.length; index++) {
      if (worldMask && worldMask[index] === 0) {
        continue;
      }
      const temperature = data.temperatureMap[index];
      const moisture = data.moistureMap[index];
      temperatureMin = Math.min(temperatureMin, temperature);
      temperatureMax = Math.max(temperatureMax, temperature);
      temperatureSum += temperature;
      temperatureSquares += temperature * temperature;
      moistureMin = Math.min(moistureMin, moisture);
      moistureMax = Math.max(moistureMax, moisture);
      moistureSum += moisture;
      moistureSquares += moisture * moisture;
      if (data.riverMap[index] > 0) {
        riverCells++;
      }
      if (data.lakeMap[index] > 0) {
        lakeCells++;
      }
      basinCount = Math.max(basinCount, data.basinMap[index]);
      samples++;
    }
    if (samples === 0) {
      return undefined;
    }
    const temperatureMean = temperatureSum / samples;
    const moistureMean = moistureSum / samples;
    return {
      temperatureMin,
      temperatureMax,
      temperatureMean,
      temperatureStdDev: Math.sqrt(
        Math.max(0, temperatureSquares / samples - temperatureMean * temperatureMean)
      ),
      moistureMin,
      moistureMax,
      moistureMean,
      moistureStdDev: Math.sqrt(
        Math.max(0, moistureSquares / samples - moistureMean * moistureMean)
      ),
      riverCells,
      lakeCells,
      basinCount,
      bytes:
        data.temperatureMap.byteLength +
        data.moistureMap.byteLength +
        data.riverMap.byteLength +
        data.lakeMap.byteLength +
        data.basinMap.byteLength,
    };
  }
}
