import {
  DEFAULT_LANDMASS_CONFIG,
  MAX_LANDMASS_SCALE,
  MAX_LANDMASSES,
  MIN_LANDMASS_SCALE,
} from './landmass-defaults';
import {
  createShelfTemplates,
  createStructure,
  estimateCoverage,
  groupStructures,
  type StructureSeed,
} from './landmass-layout';
import { createLandmassSampler } from './landmass-sampler';
import type { MapContext } from '../context';
import { GenerationCancelledError } from '../errors';
import { assertStageOutput, type MapStage } from '../stage';
import { LANDMASS_LAYOUT_STAGE } from '../stage-definitions';
import type {
  LandmassConfig,
  LandmassDefinition,
  MapConfig,
  MapState,
  StageMetrics,
  StageProgressReporter,
} from '../types';

type LandmassLayout = NonNullable<MapState['landmassLayout']>;

/** Builds the global layout of geological structures; heights belong to later stages. */
export class LandmassLayoutStage implements MapStage<MapConfig, MapState> {
  readonly id = LANDMASS_LAYOUT_STAGE.id;
  readonly name = LANDMASS_LAYOUT_STAGE.name;
  readonly configKeys = LANDMASS_LAYOUT_STAGE.configKeys;
  readonly progressStep = 0.25;

  async execute(
    context: MapContext<MapConfig, MapState>,
    signal: AbortSignal,
    report: StageProgressReporter
  ): Promise<{ landmassLayout: LandmassLayout; landmassIdMap: Uint8Array }> {
    const { sampleWidth, sampleHeight } = context.config.world.dimensions;
    const worldMask = context.state.worldMask;
    if (!worldMask || worldMask.length !== sampleWidth * sampleHeight) {
      throw new Error('A valid world mask must be generated before the landmass layout.');
    }

    const config = context.config.landmasses ?? DEFAULT_LANDMASS_CONFIG;
    this.validateConfig(config);
    const random = context.random.create(this.id);
    const shape = context.config.world.shape;
    const structures: StructureSeed[] = [];

    for (let index = 0; index < config.count; index++) {
      if (signal.aborted) {
        throw new GenerationCancelledError();
      }
      structures.push(createStructure(index, config, shape, random));
      report(((index + 1) / config.count) * 0.5);
    }

    const { groups, count } = groupStructures(structures);
    const shelves = createShelfTemplates(config, count);
    const landmasses: LandmassDefinition[] = structures.map((structure, index) => ({
      id: `landmass-${index + 1}`,
      ...structure,
      shelfId: shelves[groups[index]].id,
    }));
    const layout = { landmasses, shelves };

    const landmassAt = createLandmassSampler(landmasses);
    const landmassIdMap = new Uint8Array(sampleWidth * sampleHeight);
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
        landmassIdMap[cell] = landmassAt(x / xDivisor, normalizedY);
      }

      report(0.5 + ((y + 1) / sampleHeight) * 0.5);
    }

    context.state.landmassLayout = layout;
    context.state.landmassIdMap = landmassIdMap;
    return { landmassLayout: layout, landmassIdMap };
  }

  validate(state: Readonly<MapState>, config: Readonly<MapConfig>): void {
    const { sampleWidth, sampleHeight } = config.world.dimensions;
    assertStageOutput(state.landmassIdMap, 'uint8', sampleWidth * sampleHeight);

    const layout = state.landmassLayout;
    if (!layout || layout.landmasses.length === 0 || layout.shelves.length === 0) {
      throw new Error('Pipeline completed without all required map data.');
    }

    const ids = new Set<string>();
    for (const landmass of layout.landmasses) {
      if (ids.has(landmass.id)) {
        throw new Error(`Pipeline produced a duplicate landmass id: "${landmass.id}".`);
      }
      ids.add(landmass.id);
      if (landmass.spine.length < 2 || landmass.widthProfile.length !== landmass.spine.length) {
        throw new Error(`Pipeline produced an invalid spine for "${landmass.id}".`);
      }
      if (!landmass.spine.every(isWorldPoint) || !landmass.widthProfile.every(width => width > 0)) {
        throw new Error(`Pipeline produced invalid geometry for "${landmass.id}".`);
      }
      if (!layout.shelves.some(shelf => shelf.id === landmass.shelfId)) {
        throw new Error(`Pipeline produced an unknown shelf for "${landmass.id}".`);
      }
    }
  }

  summarize(
    context: MapContext<MapConfig, MapState>,
    data: Record<string, unknown>
  ): StageMetrics | undefined {
    const layout = data.landmassLayout as LandmassLayout | undefined;
    const idMap = data.landmassIdMap;
    if (!layout) {
      return undefined;
    }

    const worldMask = context.state.worldMask;
    const cells = worldMask?.length ?? 0;
    const landCells = worldMask ? worldMask.reduce((sum, value) => sum + value, 0) : 0;
    return {
      structures: layout.landmasses.length,
      shelves: layout.shelves.length,
      coverage: estimateCoverage(layout.landmasses, cells === 0 ? 0 : landCells / cells),
      ...(idMap instanceof Uint8Array ? { bytes: idMap.byteLength } : {}),
    };
  }

  private validateConfig(config: LandmassConfig): void {
    if (!Number.isInteger(config.count) || config.count < 1 || config.count > MAX_LANDMASSES) {
      throw new RangeError(`Landmass count must be between 1 and ${MAX_LANDMASSES}.`);
    }
    if (
      !Number.isFinite(config.scale) ||
      config.scale < MIN_LANDMASS_SCALE ||
      config.scale > MAX_LANDMASS_SCALE
    ) {
      throw new RangeError(
        `Landmass scale must be between ${MIN_LANDMASS_SCALE} and ${MAX_LANDMASS_SCALE}.`
      );
    }
    if (!isNormalized(config.irregularity)) {
      throw new RangeError('Landmass irregularity must be within 0..1.');
    }
    if (!isNormalized(config.shelf.falloff)) {
      throw new RangeError('Landmass shelf falloff must be within 0..1.');
    }
    if (!isNormalized(config.shelf.irregularity)) {
      throw new RangeError('Landmass shelf irregularity must be within 0..1.');
    }
    if (!isNormalized(config.shelf.targetDepth)) {
      throw new RangeError('Landmass shelf target depth must be within 0..1.');
    }
    if (!(config.shelf.width > 0 && config.shelf.width <= 0.5)) {
      throw new RangeError('Landmass shelf width must be within 0..0.5.');
    }
  }
}

function isWorldPoint(point: { readonly x: number; readonly y: number }): boolean {
  return isNormalized(point.x) && isNormalized(point.y);
}

function isNormalized(value: number): boolean {
  return Number.isFinite(value) && value >= 0 && value <= 1;
}
