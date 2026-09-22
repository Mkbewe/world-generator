import {
  DEFAULT_MACRO_DEFORMATION,
  DEFAULT_MACRO_REGIONS,
  DEFAULT_REGION_NOISE_SOURCE,
  MAX_MACRO_REGIONS,
} from './macro-region-defaults';
import {
  createRegionDisplacement,
  type RegionDisplacement,
  type RegionOffset,
} from './macro-region-displacement';
import type { MapContext } from '../context';
import { GenerationCancelledError } from '../errors';
import { assertStageOutput, type MapStage } from '../stage';
import { MACRO_REGION_STAGE } from '../stage-definitions';
import type {
  MacroRegionConfig,
  MacroRegionDeformation,
  MacroRegionGeometry,
  MapConfig,
  MapState,
  StageMetrics,
  StageProgressReporter,
} from '../types';

export class MacroRegionStage implements MapStage<MapConfig, MapState> {
  readonly id = MACRO_REGION_STAGE.id;
  readonly name = MACRO_REGION_STAGE.name;
  readonly configKeys = MACRO_REGION_STAGE.configKeys;
  readonly progressStep = 0.25;

  async execute(
    context: MapContext<MapConfig, MapState>,
    signal: AbortSignal,
    report: StageProgressReporter
  ): Promise<{ macroRegionIdMap: Uint8Array }> {
    const { sampleWidth, sampleHeight } = context.config.world.dimensions;
    const regions = context.config.macroRegions ?? DEFAULT_MACRO_REGIONS;
    const deformation = context.config.macroRegionDeformation ?? DEFAULT_MACRO_DEFORMATION;
    const source = deformation.source ?? DEFAULT_REGION_NOISE_SOURCE;
    this.validateConfig(regions);
    this.validateDeformation(deformation);

    const worldMask = context.state.worldMask;
    if (!worldMask || worldMask.length !== sampleWidth * sampleHeight) {
      throw new Error('A valid world mask must be generated before macro regions.');
    }
    const noiseMap = context.state.noiseMap;
    if (source === 'noise-map' && (!noiseMap || noiseMap.length !== sampleWidth * sampleHeight)) {
      throw new Error('A valid noise map must be generated before macro regions.');
    }

    const regionAt = createMacroRegionSampler(
      regions,
      deformation,
      createRegionDisplacement({
        source,
        seed: context.config.world.seed,
        width: sampleWidth,
        height: sampleHeight,
        noiseAt: noiseMap
          ? (cellX, cellY) => {
              const index = cellY * sampleWidth + cellX;
              return worldMask[index] === 1 ? noiseMap[index] : undefined;
            }
          : undefined,
      })
    );

    const macroRegionIdMap = new Uint8Array(sampleWidth * sampleHeight);
    const xDivisor = Math.max(1, sampleWidth - 1);
    const yDivisor = Math.max(1, sampleHeight - 1);

    for (let y = 0; y < sampleHeight; y++) {
      if (signal.aborted) {
        throw new GenerationCancelledError();
      }

      const normalizedY = y / yDivisor;
      for (let x = 0; x < sampleWidth; x++) {
        const cell = y * sampleWidth + x;
        if (worldMask[cell] === 0) {
          continue;
        }
        const normalizedX = x / xDivisor;
        macroRegionIdMap[cell] = regionAt(normalizedX, normalizedY);
      }

      report((y + 1) / sampleHeight);
    }

    context.state.macroRegionIdMap = macroRegionIdMap;
    return { macroRegionIdMap };
  }

  validate(state: Readonly<MapState>, config: Readonly<MapConfig>): void {
    const { sampleWidth, sampleHeight } = config.world.dimensions;
    assertStageOutput(state.worldMask, 'uint8', sampleWidth * sampleHeight);
    assertStageOutput(state.macroRegionIdMap, 'uint8', sampleWidth * sampleHeight);
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
      deformationSource: deformation.source ?? DEFAULT_REGION_NOISE_SOURCE,
      bytes: regionIdMap.byteLength,
    } satisfies StageMetrics;
  }

  private validateDeformation(deformation: MacroRegionDeformation): void {
    if (!Number.isFinite(deformation.amplitude) || deformation.amplitude < 0) {
      throw new RangeError('Macro region deformation amplitude must be zero or greater.');
    }
    if (
      deformation.source !== undefined &&
      deformation.source !== 'dedicated' &&
      deformation.source !== 'noise-map'
    ) {
      throw new RangeError('Macro region noise source must be dedicated or noise-map.');
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

/** Shared continuous classification for generation and screen-space painting. */
export function createMacroRegionSampler(
  regions: readonly MacroRegionConfig[],
  deformation: MacroRegionDeformation,
  displacement?: RegionDisplacement
): (x: number, y: number) => number {
  const needsDisplacement =
    displacement !== undefined &&
    regions.some(region => (region.irregularity ?? deformation.amplitude) > 0);
  const offset = needsDisplacement ? displacement : undefined;

  return (x, y) => {
    const shift: RegionOffset = offset ? offset(x, y) : 0;
    return ownerIndex(regions, x, y, shift, deformation.amplitude);
  };
}

function ownerIndex(
  regions: readonly MacroRegionConfig[],
  x: number,
  y: number,
  displacement: RegionOffset,
  fallbackAmplitude: number
): number {
  // Overlays are painter-ordered: the last matching overlay is on top.
  for (let index = regions.length - 1; index >= 0; index--) {
    const region = regions[index];
    if (region.role !== 'overlay') {
      continue;
    }
    const amplitude = region.irregularity ?? fallbackAmplitude;
    const coordinate = geometryCoordinate(region.geometry, x, y, displacement, amplitude);
    if (containsCoordinate(region.geometry, coordinate)) {
      return index;
    }
  }

  let nearest = 0;
  let nearestDistance = Infinity;
  for (const [index, region] of regions.entries()) {
    if (region.role !== 'base') {
      continue;
    }
    const coordinate = geometryCoordinate(region.geometry, x, y, displacement, fallbackAmplitude);
    if (containsCoordinate(region.geometry, coordinate)) {
      return index;
    }
    const distance = distanceToCoordinate(region.geometry, coordinate);
    if (distance < nearestDistance) {
      nearest = index;
      nearestDistance = distance;
    }
  }
  return nearest;
}

function geometryCoordinate(
  geometry: MacroRegionGeometry,
  x: number,
  y: number,
  displacement: RegionOffset,
  amplitude: number
): number {
  if (typeof displacement === 'number') {
    const shift = displacement * amplitude;
    if (geometry.kind === 'ring') {
      return Math.hypot(x - geometry.center.x, y - geometry.center.y) + shift;
    }
    return axisCoordinate(geometry, x, y) + shift;
  }

  const shiftedX = x + displacement.x * amplitude;
  const shiftedY = y + displacement.y * amplitude;
  if (geometry.kind === 'ring') {
    return Math.hypot(shiftedX - geometry.center.x, shiftedY - geometry.center.y);
  }
  return geometry.axis === 'x' ? shiftedX : shiftedY;
}

function axisCoordinate(
  geometry: Extract<MacroRegionGeometry, { kind: 'band' }>,
  x: number,
  y: number
): number {
  return geometry.axis === 'x' ? x : y;
}

function containsCoordinate(geometry: MacroRegionGeometry, coordinate: number): boolean {
  if (geometry.kind === 'ring') {
    return coordinate >= geometry.innerRadius && coordinate <= geometry.outerRadius;
  }
  return Math.abs(coordinate - geometry.center) <= geometry.width / 2;
}

function distanceToCoordinate(geometry: MacroRegionGeometry, coordinate: number): number {
  if (geometry.kind === 'ring') {
    return Math.max(coordinate - geometry.outerRadius, geometry.innerRadius - coordinate, 0);
  }
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

function isNormalized(value: number): boolean {
  return Number.isFinite(value) && value >= 0 && value <= 1;
}
