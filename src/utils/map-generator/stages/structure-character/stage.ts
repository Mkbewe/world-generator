import { validateCharacter } from './character-check';
import {
  DEFAULT_STRUCTURE_CHARACTER_CONFIG,
  MAX_PROFILE_VARIATION,
  MAX_REGION_DENSITY,
  MIN_PROFILE_VARIATION,
  MIN_REGION_DENSITY,
} from './defaults';
import { buildProfiles } from './profiles';
import { buildRegions } from './regions';
import { GenerationCancelledError } from '../../errors';
import type { MapContext } from '../../pipeline/context';
import { type MapStage } from '../../pipeline/stage';
import { type PipelineStageId, STRUCTURE_CHARACTER_STAGE } from '../../pipeline/stage-definitions';
import type {
  MapConfig,
  MapState,
  StageMetrics,
  StageProgressReporter,
  StructureCharacterConfig,
  StructureRegionDefinition,
  StructureTerrainProfile,
} from '../../types';

/** Share of the stage progress spent on the structure profiles. */
const PROFILE_PROGRESS = 0.7;

/**
 * Assigns terrain intent to the geological structures: one profile per
 * structure and regional overrides. It produces definitions only — no raster
 * and no heights, so the stage is independent of the world cell count. The
 * heightmap later samples the profiles and the regions into a continuous
 * elevation.
 */
export class StructureCharacterStage implements MapStage<
  MapConfig,
  MapState,
  PipelineStageId,
  {
    structureProfiles: StructureTerrainProfile[];
    structureRegions: StructureRegionDefinition[];
  }
> {
  readonly id: PipelineStageId = STRUCTURE_CHARACTER_STAGE.id;
  readonly name = STRUCTURE_CHARACTER_STAGE.name;
  readonly configKeys = STRUCTURE_CHARACTER_STAGE.configKeys;
  readonly reads: readonly (keyof MapState)[] = ['landmassLayout'];
  readonly writes = ['structureProfiles', 'structureRegions'] as const;
  readonly progressStep = 0.1;

  async execute(
    context: MapContext<MapConfig, MapState, PipelineStageId>,
    signal: AbortSignal,
    report: StageProgressReporter
  ): Promise<{
    structureProfiles: StructureTerrainProfile[];
    structureRegions: StructureRegionDefinition[];
  }> {
    const layout = context.state.landmassLayout;
    if (!layout) {
      throw new Error('A landmass layout must be generated before the structure character.');
    }

    const config = context.config.structureCharacter ?? DEFAULT_STRUCTURE_CHARACTER_CONFIG;
    this.validateConfig(config);
    const random = context.random.create(this.id);
    const structureProfiles = buildProfiles(layout.structures, config, random);
    if (signal.aborted) {
      throw new GenerationCancelledError();
    }

    report(PROFILE_PROGRESS);
    const structureRegions = buildRegions(
      layout.structures,
      structureProfiles,
      config,
      context.config.world.shape,
      random
    );
    validateCharacter(structureProfiles, structureRegions, layout, context.config.world.shape);

    report(1);
    return { structureProfiles, structureRegions };
  }

  validate(state: Readonly<MapState>, config: Readonly<MapConfig>): void {
    const layout = state.landmassLayout;
    const profiles = state.structureProfiles;
    const regions = state.structureRegions;
    if (!layout || !profiles || !regions) {
      throw new Error('Pipeline completed without all required map data.');
    }
    validateCharacter(profiles, regions, layout, config.world.shape);
  }

  summarize(
    _context: MapContext<MapConfig, MapState, PipelineStageId>,
    data: {
      structureProfiles: StructureTerrainProfile[];
      structureRegions: StructureRegionDefinition[];
    }
  ): StageMetrics | undefined {
    return {
      profiles: data.structureProfiles.length,
      regions: data.structureRegions.length,
    };
  }

  private validateConfig(config: StructureCharacterConfig): void {
    if (
      !Number.isFinite(config.profileVariation) ||
      config.profileVariation < MIN_PROFILE_VARIATION ||
      config.profileVariation > MAX_PROFILE_VARIATION
    ) {
      throw new RangeError(
        `Structure character profile variation must be between ${MIN_PROFILE_VARIATION} and ${MAX_PROFILE_VARIATION}.`
      );
    }
    if (
      !Number.isFinite(config.regionDensity) ||
      config.regionDensity < MIN_REGION_DENSITY ||
      config.regionDensity > MAX_REGION_DENSITY
    ) {
      throw new RangeError(
        `Structure character region density must be between ${MIN_REGION_DENSITY} and ${MAX_REGION_DENSITY}.`
      );
    }
  }
}
