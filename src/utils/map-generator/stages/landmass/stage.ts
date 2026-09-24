import { placeStructures } from './search/placement';
import { isLandmassArchetype, LANDMASS_ARCHETYPES } from './shape/archetypes';
import { buildStructure, scaleDraft } from './shape/corridor';
import { planSizes } from './shape/size-plan';
import {
  DEFAULT_LANDMASS_CONFIG,
  MAX_LANDMASS_SIZE,
  MAX_LANDMASSES,
  MIN_LANDMASS_SIZE,
} from './defaults';
import { structureExtent } from './influence';
import { validateLayout, validatePlacement } from './layout-check';
import { createMaskSampler } from './mask-sampler';
import { GenerationCancelledError } from '../../errors';
import type { MapContext } from '../../pipeline/context';
import { type MapStage } from '../../pipeline/stage';
import { LANDMASS_LAYOUT_STAGE, type PipelineStageId } from '../../pipeline/stage-definitions';
import type { SeededRandom } from '../../random/seeded-random';
import type {
  LandmassArchetype,
  LandmassConfig,
  LandmassLayout,
  MapConfig,
  MapState,
  StageMetrics,
  StageProgressReporter,
} from '../../types';

/** Share of the stage progress spent on building the structures. */
const BUILD_PROGRESS = 0.6;

/**
 * Builds the global layout of geological structures: every structure is a graph
 * of ridge nodes and edges, sized from the typical extent and centred on an
 * anchor inside the world. The stage never walks the world cells; the mask is
 * only sampled through the placement. Heights, coastlines and islands belong to
 * later stages.
 */
export class LandmassLayoutStage implements MapStage<
  MapConfig,
  MapState,
  PipelineStageId,
  { landmassLayout: LandmassLayout; dropped: number }
> {
  readonly id: PipelineStageId = LANDMASS_LAYOUT_STAGE.id;
  readonly name = LANDMASS_LAYOUT_STAGE.name;
  readonly configKeys = LANDMASS_LAYOUT_STAGE.configKeys;
  readonly reads: readonly (keyof MapState)[] = ['worldMask'];
  readonly writes = ['landmassLayout'] as const;
  readonly progressStep = 0.05;

  async execute(
    context: MapContext<MapConfig, MapState, PipelineStageId>,
    signal: AbortSignal,
    report: StageProgressReporter
  ): Promise<{ landmassLayout: LandmassLayout; dropped: number }> {
    const { sampleWidth, sampleHeight } = context.config.world.dimensions;
    const worldMask = context.state.worldMask;
    if (!worldMask || worldMask.length !== sampleWidth * sampleHeight) {
      throw new Error('A valid world mask must be generated before the landmass layout.');
    }

    const config = context.config.landmasses ?? DEFAULT_LANDMASS_CONFIG;
    this.validateConfig(config);
    const random = context.random.create(this.id);
    // An explicitly empty pool means the layout draws nothing; an empty world
    // has no room, so the placement drops every candidate by itself.
    const planned = config.archetypes?.length === 0 ? 0 : config.count;
    const drafts = [];

    for (let index = 0; index < planned; index++) {
      if (signal.aborted) {
        throw new GenerationCancelledError();
      }
      drafts.push(
        buildStructure(`landmass-${index + 1}`, pickArchetype(config.archetypes, random), random)
      );
      report(((index + 1) / planned) * BUILD_PROGRESS);
    }

    const sizes = planSizes(
      drafts.map(draft => ({ extent: structureExtent(draft) })),
      config,
      random
    );
    // The size plan lists the largest structures first, so they are placed first.
    const scaled = drafts.map((draft, index) => scaleDraft(draft, sizes.scales[index]));
    const ordered = sizes.order.map(index => scaled[index]);
    const insideWorld = createMaskSampler(worldMask, sampleWidth, sampleHeight);
    const placement = placeStructures(ordered, insideWorld, config.shelf, random);
    const layout: LandmassLayout = {
      structures: placement.structures,
      shelves: placement.shelves,
    };
    validateLayout(layout);

    report(1);
    return { landmassLayout: layout, dropped: placement.dropped };
  }

  validate(state: Readonly<MapState>, config: Readonly<MapConfig>): void {
    const layout = state.landmassLayout;
    const worldMask = state.worldMask;
    if (!layout || !worldMask) {
      throw new Error('Pipeline completed without all required map data.');
    }
    validateLayout(layout);
    // The hard placement contract: nothing overlaps and nothing hangs outside.
    const { sampleWidth, sampleHeight } = config.world.dimensions;
    const problems = validatePlacement(
      layout.structures,
      createMaskSampler(worldMask, sampleWidth, sampleHeight),
      0.5
    );
    if (problems.length > 0) {
      throw new Error(`Pipeline produced an invalid placement: ${problems[0]}`);
    }
  }

  summarize(
    _context: MapContext<MapConfig, MapState, PipelineStageId>,
    data: { landmassLayout: LandmassLayout; dropped: number }
  ): StageMetrics | undefined {
    const layout = data.landmassLayout;
    if (!layout) {
      return undefined;
    }

    return {
      structures: layout.structures.length,
      shelves: layout.shelves.length,
      nodes: layout.structures.reduce((total, structure) => total + structure.nodes.length, 0),
      edges: layout.structures.reduce((total, structure) => total + structure.edges.length, 0),
      dropped: typeof data.dropped === 'number' ? data.dropped : 0,
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
    if (!isNormalized(config.diversity)) {
      throw new RangeError('Landmass diversity must be within 0..1.');
    }
    for (const archetype of config.archetypes ?? []) {
      if (!isLandmassArchetype(archetype)) {
        throw new RangeError(`Unknown landmass archetype: "${String(archetype)}".`);
      }
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

function pickArchetype(
  pool: readonly LandmassArchetype[] | undefined,
  random: SeededRandom
): LandmassArchetype {
  if (!pool) {
    return LANDMASS_ARCHETYPES[random.nextInteger(0, LANDMASS_ARCHETYPES.length - 1)];
  }
  return pool[random.nextInteger(0, pool.length - 1)];
}

function isNormalized(value: number): boolean {
  return Number.isFinite(value) && value >= 0 && value <= 1;
}
