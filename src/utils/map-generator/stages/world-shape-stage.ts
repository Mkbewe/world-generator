import { containsWorld } from '../../world-shape';
import type { MapContext } from '../context';
import { GenerationCancelledError } from '../errors';
import { spaceOf } from '../space';
import { assertStageOutput, type MapStage } from '../stage';
import { type PipelineStageId, WORLD_SHAPE_STAGE } from '../stage-definitions';
import type { MapConfig, MapState, StageMetrics, StageProgressReporter } from '../types';

export class WorldShapeStage implements MapStage<
  MapConfig,
  MapState,
  PipelineStageId,
  { worldMask: Uint8Array }
> {
  readonly id: PipelineStageId = WORLD_SHAPE_STAGE.id;
  readonly name = WORLD_SHAPE_STAGE.name;
  readonly configKeys = WORLD_SHAPE_STAGE.configKeys;
  readonly reads: readonly (keyof MapState)[] = [];
  readonly writes = ['worldMask'] as const;
  readonly progressStep = 0.5;

  async execute(
    context: MapContext<MapConfig, MapState, PipelineStageId>,
    signal: AbortSignal,
    report: StageProgressReporter
  ): Promise<{ worldMask: Uint8Array }> {
    const { sampleWidth, sampleHeight } = context.config.world.dimensions;
    const space = spaceOf(context);

    const worldMask = new Uint8Array(sampleWidth * sampleHeight);
    const shape = context.config.world.shape;

    for (let y = 0; y < sampleHeight; y++) {
      if (signal.aborted) {
        throw new GenerationCancelledError();
      }

      for (let x = 0; x < sampleWidth; x++) {
        const mask = space.cellToMask(x, y);
        const isInsideWorld = containsWorld(shape, mask.x, mask.y);
        worldMask[y * sampleWidth + x] = isInsideWorld ? 1 : 0;
      }

      report((y + 1) / sampleHeight);
    }

    return { worldMask };
  }

  validate(state: Readonly<MapState>, config: Readonly<MapConfig>): void {
    const { sampleWidth, sampleHeight } = config.world.dimensions;
    assertStageOutput(state.worldMask, 'uint8', sampleWidth * sampleHeight);
  }

  summarize(
    context: MapContext<MapConfig, MapState, PipelineStageId>,
    data: { worldMask: Uint8Array }
  ): StageMetrics | undefined {
    const mask = data.worldMask;
    if (!(mask instanceof Uint8Array)) {
      return undefined;
    }

    const { sampleWidth, sampleHeight } = context.config.world.dimensions;
    const cells = sampleWidth * sampleHeight;
    let filledCells = 0;

    for (let index = 0; index < mask.length; index++) {
      if (mask[index] === 1) {
        filledCells++;
      }
    }

    return {
      shape: context.config.world.shape,
      width: sampleWidth,
      height: sampleHeight,
      cells,
      filledCells,
      coverage: cells === 0 ? 0 : filledCells / cells,
      bytes: mask.byteLength,
    };
  }
}
