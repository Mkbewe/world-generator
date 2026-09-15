import { createNoise2D } from 'simplex-noise';

import {
  DEFAULT_MACRO_DEFORMATION,
  DEFAULT_MACRO_REGIONS,
  MAX_MACRO_REGIONS,
} from './macro-region-defaults';
import type { MapContext } from '../context';
import { GenerationCancelledError } from '../errors';
import { assertStageOutput, type MapStage } from '../stage';
import type {
  MacroRegionConfig,
  MacroRegionDeformation,
  MacroRegionGeometry,
  MapConfig,
  MapState,
  StageMetrics,
  StageProgressReporter,
} from '../types';

const DEFAULT_DEFORMATION_FREQUENCY = 3;
const DEFAULT_DEFORMATION_OCTAVES = 2;

export class MacroRegionStage implements MapStage<MapConfig, MapState> {
  readonly id = 'macro-region';
  readonly name = 'Macro region generation';
  readonly progressStep = 0.25;

  async execute(
    context: MapContext<MapConfig, MapState>,
    signal: AbortSignal,
    report: StageProgressReporter
  ): Promise<{ macroRegionIdMap: Uint8Array }> {
    const { width, height } = context.config.world;
    const regions = context.config.macroRegions ?? DEFAULT_MACRO_REGIONS;
    const deformation = context.config.macroRegionDeformation ?? DEFAULT_MACRO_DEFORMATION;
    this.validateConfig(regions);
    this.validateDeformation(deformation);
    const displacement = createDisplacement(context, regions, deformation);

    const macroRegionIdMap = new Uint8Array(width * height);
    const xDivisor = Math.max(1, width - 1);
    const yDivisor = Math.max(1, height - 1);
    const worldMask = context.state.worldMask;
    if (!worldMask || worldMask.length !== width * height) {
      throw new Error('A valid world mask must be generated before macro regions.');
    }

    for (let y = 0; y < height; y++) {
      if (signal.aborted) {
        throw new GenerationCancelledError();
      }

      const normalizedY = y / yDivisor;
      for (let x = 0; x < width; x++) {
        const cell = y * width + x;
        if (worldMask[cell] === 0) {
          continue;
        }
        const normalizedX = x / xDivisor;
        const offset = displacement ? displacement(normalizedX, normalizedY) : { x: 0, y: 0 };
        macroRegionIdMap[cell] = ownerIndex(
          regions,
          normalizedX,
          normalizedY,
          offset,
          deformation.amplitude
        );
      }

      report((y + 1) / height);
    }

    context.state.macroRegionIdMap = macroRegionIdMap;
    return { macroRegionIdMap };
  }

  validate(state: Readonly<MapState>, config: Readonly<MapConfig>): void {
    const { width, height } = config.world;
    assertStageOutput(state.worldMask, 'uint8', width * height);
    assertStageOutput(state.macroRegionIdMap, 'uint8', width * height);
  }

  summarize(context: MapContext<MapConfig, MapState>, data: Record<string, unknown>) {
    const regionIdMap = data.macroRegionIdMap;
    if (!(regionIdMap instanceof Uint8Array) || regionIdMap.length === 0) {
      return undefined;
    }

    const regions = context.config.macroRegions ?? DEFAULT_MACRO_REGIONS;
    const deformation = context.config.macroRegionDeformation ?? DEFAULT_MACRO_DEFORMATION;
    const overlays = regions.filter(region => region.role === 'overlay').length;
    return {
      regions: regions.length,
      overlays,
      deformationAmplitude: deformation.amplitude,
      deformationFrequency: deformation.frequency ?? DEFAULT_DEFORMATION_FREQUENCY,
      deformationOctaves: deformation.octaves ?? DEFAULT_DEFORMATION_OCTAVES,
      bytes: regionIdMap.byteLength,
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
    if (regions.length > MAX_MACRO_REGIONS) {
      throw new RangeError(`At most ${MAX_MACRO_REGIONS} macro regions are allowed.`);
    }
    if (!regions.some(region => region.role === 'base')) {
      throw new RangeError('At least one base macro region is required.');
    }

    const ids = new Set<string>();
    for (const region of regions) {
      if (!region.id) {
        throw new RangeError('Macro region id must not be empty.');
      }
      if (ids.has(region.id)) {
        throw new RangeError(`Duplicate macro region id: "${region.id}".`);
      }
      ids.add(region.id);
      if (region.role !== 'base' && region.role !== 'overlay') {
        throw new RangeError(`Macro region "${region.id}" has an invalid role.`);
      }
      validateGeometry(region.id, region.geometry);
      if (!isNormalized(region.danger)) {
        throw new RangeError(`Macro region "${region.id}" danger must be within 0..1.`);
      }
      if (
        region.irregularity !== undefined &&
        (!Number.isFinite(region.irregularity) || region.irregularity < 0)
      ) {
        throw new RangeError(`Macro region "${region.id}" irregularity must be zero or greater.`);
      }
    }
  }
}

function ownerIndex(
  regions: readonly MacroRegionConfig[],
  x: number,
  y: number,
  displacement: { readonly x: number; readonly y: number },
  fallbackAmplitude: number
): number {
  // Overlays are painter-ordered: the last matching overlay is on top.
  for (let index = regions.length - 1; index >= 0; index--) {
    const region = regions[index];
    if (region.role !== 'overlay') {
      continue;
    }
    const amplitude = region.irregularity ?? fallbackAmplitude;
    if (contains(region.geometry, x + displacement.x * amplitude, y + displacement.y * amplitude)) {
      return index;
    }
  }

  const baseX = x + displacement.x * fallbackAmplitude;
  const baseY = y + displacement.y * fallbackAmplitude;
  let nearest = 0;
  let nearestDistance = Infinity;
  for (const [index, region] of regions.entries()) {
    if (region.role !== 'base') {
      continue;
    }
    if (contains(region.geometry, baseX, baseY)) {
      return index;
    }
    const distance = distanceTo(region.geometry, baseX, baseY);
    if (distance < nearestDistance) {
      nearest = index;
      nearestDistance = distance;
    }
  }
  return nearest;
}

function contains(geometry: MacroRegionGeometry, x: number, y: number): boolean {
  if (geometry.kind === 'ring') {
    const distance = Math.hypot(x - geometry.center.x, y - geometry.center.y);
    return distance >= geometry.innerRadius && distance <= geometry.outerRadius;
  }
  const coordinate = geometry.axis === 'x' ? x : y;
  return Math.abs(coordinate - geometry.center) <= geometry.width / 2;
}

function distanceTo(geometry: MacroRegionGeometry, x: number, y: number): number {
  if (geometry.kind === 'ring') {
    const distance = Math.hypot(x - geometry.center.x, y - geometry.center.y);
    return Math.max(distance - geometry.outerRadius, geometry.innerRadius - distance, 0);
  }
  const coordinate = geometry.axis === 'x' ? x : y;
  return Math.max(Math.abs(coordinate - geometry.center) - geometry.width / 2, 0);
}

function validateGeometry(id: string, geometry: MacroRegionGeometry): void {
  if (geometry.kind === 'ring') {
    if (!isNormalized(geometry.center.x) || !isNormalized(geometry.center.y)) {
      throw new RangeError(`Macro region "${id}" center must be within 0..1.`);
    }
    if (!(geometry.innerRadius >= 0 && geometry.outerRadius > geometry.innerRadius)) {
      throw new RangeError(`Macro region "${id}" must have a valid radial range.`);
    }
    return;
  }

  if (geometry.axis !== 'x' && geometry.axis !== 'y') {
    throw new RangeError(`Macro region "${id}" axis must be "x" or "y".`);
  }
  if (!isNormalized(geometry.center)) {
    throw new RangeError(`Macro region "${id}" center must be within 0..1.`);
  }
  if (!(geometry.width > 0 && geometry.width <= 1)) {
    throw new RangeError(`Macro region "${id}" width must be within 0..1.`);
  }
}

function createDisplacement(
  context: MapContext<MapConfig, MapState>,
  regions: readonly MacroRegionConfig[],
  deformation: MacroRegionDeformation
): ((x: number, y: number) => { x: number; y: number }) | undefined {
  const needsDisplacement = regions.some(
    region => (region.irregularity ?? deformation.amplitude) > 0
  );
  if (!needsDisplacement) {
    return undefined;
  }

  const frequency = deformation.frequency ?? DEFAULT_DEFORMATION_FREQUENCY;
  const octaves = deformation.octaves ?? DEFAULT_DEFORMATION_OCTAVES;
  const random = context.random.create(deformation.seed || 'macro-region');
  const displacementX = createNoise2D(() => random.next());
  const displacementY = createNoise2D(() => random.next());

  return (x, y) => ({
    x: fbm(displacementX, x * frequency, y * frequency, octaves),
    y: fbm(displacementY, x * frequency, y * frequency, octaves),
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

function isNormalized(value: number): boolean {
  return Number.isFinite(value) && value >= 0 && value <= 1;
}
