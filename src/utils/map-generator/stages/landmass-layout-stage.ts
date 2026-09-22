import { isLandmassArchetype } from './landmass-archetypes';
import {
  DEFAULT_LANDMASS_CONFIG,
  MAX_LANDMASS_SIZE,
  MAX_LANDMASSES,
  MIN_LANDMASS_SIZE,
} from './landmass-defaults';
import type { MapContext } from '../context';
import { GenerationCancelledError } from '../errors';
import { type MapStage } from '../stage';
import { LANDMASS_LAYOUT_STAGE } from '../stage-definitions';
import type {
  LandmassConfig,
  MapConfig,
  MapState,
  StageMetrics,
  StageProgressReporter,
} from '../types';

type LandmassLayout = NonNullable<MapState['landmassLayout']>;

/**
 * Stub of the landmass layout stage. The old spine-and-raster implementation is
 * gone; the graph model, its archetypes and the vector layer arrive in the next
 * stages of the refactor. Until then the stage only validates its configuration
 * and produces an empty layout.
 */
export class LandmassLayoutStage implements MapStage<MapConfig, MapState> {
  readonly id = LANDMASS_LAYOUT_STAGE.id;
  readonly name = LANDMASS_LAYOUT_STAGE.name;
  readonly configKeys = LANDMASS_LAYOUT_STAGE.configKeys;
  readonly progressStep = 0.02;

  async execute(
    context: MapContext<MapConfig, MapState>,
    signal: AbortSignal,
    report: StageProgressReporter
  ): Promise<{ landmassLayout: LandmassLayout }> {
    const { sampleWidth, sampleHeight } = context.config.world.dimensions;
    const worldMask = context.state.worldMask;
    if (!worldMask || worldMask.length !== sampleWidth * sampleHeight) {
      throw new Error('A valid world mask must be generated before the landmass layout.');
    }

    const config = context.config.landmasses ?? DEFAULT_LANDMASS_CONFIG;
    this.validateConfig(config);
    if (signal.aborted) {
      throw new GenerationCancelledError();
    }

    const layout: LandmassLayout = { landmasses: [], shelves: [] };
    context.state.landmassLayout = layout;
    report(1);
    return { landmassLayout: layout };
  }

  validate(state: Readonly<MapState>): void {
    if (!state.landmassLayout) {
      throw new Error('Pipeline completed without all required map data.');
    }
  }

  summarize(
    _context: MapContext<MapConfig, MapState>,
    data: Record<string, unknown>
  ): StageMetrics | undefined {
    const layout = data.landmassLayout as LandmassLayout | undefined;
    if (!layout) {
      return undefined;
    }

    return {
      structures: layout.landmasses.length,
      shelves: layout.shelves.length,
    };
  }

  private validateConfig(config: LandmassConfig): void {
    if (!Number.isInteger(config.count) || config.count < 1 || config.count > MAX_LANDMASSES) {
      throw new RangeError(`Landmass count must be between 1 and ${MAX_LANDMASSES}.`);
    }
    if (
      !Number.isFinite(config.size) ||
      config.size < MIN_LANDMASS_SIZE ||
      config.size > MAX_LANDMASS_SIZE
    ) {
      throw new RangeError(
        `Landmass size must be between ${MIN_LANDMASS_SIZE} and ${MAX_LANDMASS_SIZE}.`
      );
    }
    for (const archetype of config.archetypes ?? []) {
      if (!isLandmassArchetype(archetype)) {
        throw new RangeError(`Unknown landmass archetype: "${String(archetype)}".`);
      }
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

function isNormalized(value: number): boolean {
  return Number.isFinite(value) && value >= 0 && value <= 1;
}
