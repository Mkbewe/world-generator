import { createNoise2D } from 'simplex-noise';

import { DEFAULT_MACRO_DEFORMATION, DEFAULT_MACRO_REGIONS } from './macro-region-defaults';
import type { MapContext } from '../context';
import { GenerationCancelledError } from '../errors';
import { assertStageOutput, type MapStage } from '../stage';
import type {
  MacroRegionConfig,
  MacroRegionDeformation,
  MapConfig,
  MapState,
  StageMetrics,
  StageProgressReporter,
} from '../types';

export class MacroRegionStage implements MapStage<MapConfig, MapState> {
  readonly id = 'macro-region';
  readonly name = 'Macro region generation';
  readonly progressStep = 0.25;

  async execute(
    context: MapContext<MapConfig, MapState>,
    signal: AbortSignal,
    report: StageProgressReporter
  ): Promise<{ progressionMap: Float32Array; macroRegionIdMap: Uint8Array }> {
    const { width, height } = context.config.world;
    const regions = context.config.macroRegions ?? DEFAULT_MACRO_REGIONS;
    const deformation = context.config.macroRegionDeformation ?? DEFAULT_MACRO_DEFORMATION;
    this.validateConfig(regions);
    this.validateDeformation(deformation);
    const warp = createWarp(context, deformation);

    const cells = width * height;
    const progressionMap = new Float32Array(cells);
    const macroRegionIdMap = new Uint8Array(cells);
    const fallbackIndex = regions.reduce(
      (best, region, index) => (region.progression > regions[best].progression ? index : best),
      0
    );
    const xDivisor = Math.max(1, width - 1);
    const yDivisor = Math.max(1, height - 1);

    for (let y = 0; y < height; y++) {
      if (signal.aborted) {
        throw new GenerationCancelledError();
      }

      const normalizedY = y / yDivisor;

      for (let x = 0; x < width; x++) {
        const normalizedX = x / xDivisor;
        const point = warp ? warp(normalizedX, normalizedY) : { x: normalizedX, y: normalizedY };
        let weightSum = 0;
        let weightedProgression = 0;
        let bestWeight = -1;
        let bestIndex = fallbackIndex;

        for (const [index, region] of regions.entries()) {
          const weight = influence(region, point.x, point.y);
          if (weight > 0) {
            weightSum += weight;
            weightedProgression += weight * region.progression;
          }
          if (weight > bestWeight) {
            bestWeight = weight;
            bestIndex = index;
          }
        }

        const cell = y * width + x;
        if (weightSum > 0) {
          progressionMap[cell] = weightedProgression / weightSum;
          macroRegionIdMap[cell] = bestIndex;
        } else {
          progressionMap[cell] = regions[fallbackIndex].progression;
          macroRegionIdMap[cell] = fallbackIndex;
        }
      }

      report((y + 1) / height);
    }

    context.state.progressionMap = progressionMap;
    context.state.macroRegionIdMap = macroRegionIdMap;
    return { progressionMap, macroRegionIdMap };
  }

  validate(state: Readonly<MapState>, config: Readonly<MapConfig>): void {
    const { width, height } = config.world;
    assertStageOutput(state.progressionMap, 'float32', width * height);
    assertStageOutput(state.macroRegionIdMap, 'uint8', width * height);
  }

  summarize(context: MapContext<MapConfig, MapState>, data: Record<string, unknown>) {
    const progressionMap = data.progressionMap;
    if (!(progressionMap instanceof Float32Array) || progressionMap.length === 0) {
      return undefined;
    }

    let min = Infinity;
    let max = -Infinity;
    let sum = 0;
    for (const value of progressionMap) {
      min = Math.min(min, value);
      max = Math.max(max, value);
      sum += value;
    }

    const regions = context.config.macroRegions ?? DEFAULT_MACRO_REGIONS;
    const regionIdMap = data.macroRegionIdMap;

    return {
      regions: regions.length,
      min,
      max,
      mean: sum / progressionMap.length,
      bytes:
        progressionMap.byteLength +
        (regionIdMap instanceof Uint8Array ? regionIdMap.byteLength : 0),
    } satisfies StageMetrics;
  }

  private validateDeformation(deformation: MacroRegionDeformation): void {
    if (!Number.isFinite(deformation.amplitude) || deformation.amplitude < 0) {
      throw new RangeError('Macro region deformation amplitude must be zero or greater.');
    }
    if (deformation.frequency !== undefined && !(deformation.frequency > 0)) {
      throw new RangeError('Macro region deformation frequency must be greater than zero.');
    }
    if (
      deformation.octaves !== undefined &&
      (!Number.isInteger(deformation.octaves) || deformation.octaves < 1)
    ) {
      throw new RangeError('Macro region deformation octaves must be a positive integer.');
    }
  }

  private validateConfig(regions: readonly MacroRegionConfig[]): void {
    if (regions.length === 0) {
      throw new RangeError('At least one macro region is required.');
    }

    for (const region of regions) {
      if (!region.id) {
        throw new RangeError('Macro region id must not be empty.');
      }
      if (!isNormalized(region.center.x) || !isNormalized(region.center.y)) {
        throw new RangeError(`Macro region "${region.id}" center must be within 0..1.`);
      }
      if (!(region.radius > 0)) {
        throw new RangeError(`Macro region "${region.id}" radius must be greater than zero.`);
      }
      if (!(region.falloff > 0)) {
        throw new RangeError(`Macro region "${region.id}" falloff must be greater than zero.`);
      }
      if (
        region.innerRadius !== undefined &&
        !(region.innerRadius >= 0 && region.innerRadius < region.radius)
      ) {
        throw new RangeError(`Macro region "${region.id}" inner radius must be within 0..radius.`);
      }
      if (!isNormalized(region.progression)) {
        throw new RangeError(`Macro region "${region.id}" progression must be within 0..1.`);
      }
      if (region.weight !== undefined && !(region.weight > 0)) {
        throw new RangeError(`Macro region "${region.id}" weight must be greater than zero.`);
      }
    }
  }
}

function createWarp(
  context: MapContext<MapConfig, MapState>,
  deformation: MacroRegionDeformation
): ((x: number, y: number) => { x: number; y: number }) | undefined {
  if (!(deformation.amplitude > 0)) {
    return undefined;
  }

  const { amplitude } = deformation;
  const frequency = deformation.frequency ?? 3;
  const octaves = deformation.octaves ?? 2;
  const random = context.random.create(deformation.seed || 'macro-region');
  const warpX = createNoise2D(() => random.next());
  const warpY = createNoise2D(() => random.next());

  return (x, y) => ({
    x: x + amplitude * fbm(warpX, x * frequency, y * frequency, octaves),
    y: y + amplitude * fbm(warpY, x * frequency, y * frequency, octaves),
  });
}

function fbm(
  noise: (x: number, y: number) => number,
  x: number,
  y: number,
  octaves: number
): number {
  let value = 0;
  let amplitude = 1;
  let frequency = 1;
  let amplitudeSum = 0;

  for (let octave = 0; octave < octaves; octave++) {
    value += noise(x * frequency, y * frequency) * amplitude;
    amplitudeSum += amplitude;
    amplitude *= 0.5;
    frequency *= 2;
  }

  return value / amplitudeSum;
}

function influence(region: MacroRegionConfig, x: number, y: number): number {
  const distance = Math.hypot(x - region.center.x, y - region.center.y);
  const outer = smoothstep(
    Math.min(1, Math.max(0, (region.radius + region.falloff - distance) / region.falloff))
  );
  const innerRadius = region.innerRadius ?? 0;
  const inner =
    innerRadius > 0
      ? smoothstep(
          Math.min(1, Math.max(0, (distance - (innerRadius - region.falloff)) / region.falloff))
        )
      : 1;
  return outer * inner * (region.weight ?? 1);
}

function smoothstep(t: number): number {
  return t * t * (3 - 2 * t);
}

function isNormalized(value: number): boolean {
  return Number.isFinite(value) && value >= 0 && value <= 1;
}
