import { validateZones } from './character-check';
import {
  DEFAULT_STRUCTURE_CHARACTER_CONFIG,
  MAX_CHARACTER_VARIATION,
  MIN_CHARACTER_VARIATION,
} from './defaults';
import { buildZones } from './zones';
import { GenerationCancelledError } from '../../errors';
import type { MapContext } from '../../pipeline/context';
import { type MapStage } from '../../pipeline/stage';
import { type PipelineStageId, STRUCTURE_CHARACTER_STAGE } from '../../pipeline/stage-definitions';
import type {
  CharacterZone,
  MapConfig,
  MapState,
  StageMetrics,
  StageProgressReporter,
  StructureCharacterConfig,
} from '../../types';

/**
 * Assigns terrain character zones to the geological structures: one `whole`
 * zone per structure and an optional second zone on a large one. It produces
 * definitions only — no raster and no heights — so the stage is independent of
 * the world cell count.
 */
export class StructureCharacterStage implements MapStage<
  MapConfig,
  MapState,
  PipelineStageId,
  { structureZones: CharacterZone[] }
> {
  readonly id: PipelineStageId = STRUCTURE_CHARACTER_STAGE.id;
  readonly name = STRUCTURE_CHARACTER_STAGE.name;
  readonly configKeys = STRUCTURE_CHARACTER_STAGE.configKeys;
  readonly reads: readonly (keyof MapState)[] = ['landmassLayout'];
  readonly writes = ['structureZones'] as const;
  readonly progressStep = 0.1;

  async execute(
    context: MapContext<MapConfig, MapState, PipelineStageId>,
    signal: AbortSignal,
    report: StageProgressReporter
  ): Promise<{ structureZones: CharacterZone[] }> {
    const layout = context.state.landmassLayout;
    if (!layout) {
      throw new Error('A landmass layout must be generated before the structure character.');
    }

    const config = context.config.structureCharacter ?? DEFAULT_STRUCTURE_CHARACTER_CONFIG;
    this.validateConfig(config);
    const random = context.random.create(this.id);
    const structureZones = buildZones(
      layout.structures,
      config,
      context.config.world.shape,
      random
    );
    if (signal.aborted) {
      throw new GenerationCancelledError();
    }

    validateZones(structureZones, layout, context.config.world.shape);
    report(1);
    return { structureZones };
  }

  validate(state: Readonly<MapState>, config: Readonly<MapConfig>): void {
    const layout = state.landmassLayout;
    const zones = state.structureZones;
    if (!layout || !zones) {
      throw new Error('Pipeline completed without all required map data.');
    }
    validateZones(zones, layout, config.world.shape);
  }

  summarize(
    _context: MapContext<MapConfig, MapState, PipelineStageId>,
    data: { structureZones: CharacterZone[] }
  ): StageMetrics | undefined {
    return {
      zones: data.structureZones.length,
      splits: data.structureZones.filter(zone => zone.geometry.kind !== 'whole').length,
    };
  }

  private validateConfig(config: StructureCharacterConfig): void {
    if (
      !Number.isFinite(config.characterVariation) ||
      config.characterVariation < MIN_CHARACTER_VARIATION ||
      config.characterVariation > MAX_CHARACTER_VARIATION
    ) {
      throw new RangeError(
        `Structure character variation must be between ${MIN_CHARACTER_VARIATION} and ${MAX_CHARACTER_VARIATION}.`
      );
    }
  }
}
