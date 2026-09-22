import { containsWorld } from '../../world-shape';
import type { MapContext } from '../context';
import { GenerationCancelledError } from '../errors';
import { assertStageOutput, type MapStage } from '../stage';
import { WORLD_SHAPE_STAGE } from '../stage-definitions';
import type { MapConfig, MapState, StageData, StageMetrics, StageProgressReporter } from '../types';

export class WorldShapeStage implements MapStage<MapConfig, MapState> {
  readonly id = WORLD_SHAPE_STAGE.id;
  readonly name = WORLD_SHAPE_STAGE.name;
  readonly configKeys = WORLD_SHAPE_STAGE.configKeys;
  readonly progressStep = 0.5;

  async execute(
    context: MapContext<MapConfig, MapState>,
    signal: AbortSignal,
    report: StageProgressReporter
  ): Promise<{ worldMask: Uint8Array }> {
    const { sampleWidth, sampleHeight } = context.config.world.dimensions;

    const worldMask = new Uint8Array(sampleWidth * sampleHeight);
    const xDivisor = Math.max(1, sampleWidth - 1);
    const yDivisor = Math.max(1, sampleHeight - 1);
    const shape = context.config.world.shape;

    for (let y = 0; y < sampleHeight; y++) {
      if (signal.aborted) {
        throw new GenerationCancelledError();
      }

      const normalizedY = (2 * y) / yDivisor - 1;

      for (let x = 0; x < sampleWidth; x++) {
        const normalizedX = (2 * x) / xDivisor - 1;
        const isInsideWorld = containsWorld(shape, normalizedX, normalizedY);
        worldMask[y * sampleWidth + x] = isInsideWorld ? 1 : 0;
      }

      report((y + 1) / sampleHeight);
    }

    context.state.worldMask = worldMask;
    return { worldMask };
  }

  validate(state: Readonly<MapState>, config: Readonly<MapConfig>): void {
    const { sampleWidth, sampleHeight } = config.world.dimensions;
    assertStageOutput(state.worldMask, 'uint8', sampleWidth * sampleHeight);
  }

  summarize(context: MapContext<MapConfig, MapState>, data: StageData): StageMetrics | undefined {
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
