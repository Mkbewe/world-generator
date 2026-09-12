import type { MapContext } from '../context';
import { GenerationCancelledError } from '../errors';
import { assertStageOutput, type MapStage } from '../stage';
import { WORLD_SHAPE_STAGE } from '../stage-definitions';
import type { MapConfig, MapState, StageData, StageMetrics, StageProgressReporter } from '../types';

export class WorldShapeStage implements MapStage<MapConfig, MapState> {
  readonly id = WORLD_SHAPE_STAGE.id;
  readonly name = WORLD_SHAPE_STAGE.name;
  readonly progressStep = 0.5;

  async execute(
    context: MapContext<MapConfig, MapState>,
    signal: AbortSignal,
    report: StageProgressReporter
  ): Promise<{ worldMask: Uint8Array }> {
    const { width, height } = context.config.world;

    if (!Number.isInteger(width) || width <= 0 || !Number.isInteger(height) || height <= 0) {
      throw new RangeError('World width and height must be positive integers.');
    }

    const worldMask = new Uint8Array(width * height);
    const xDivisor = Math.max(1, width - 1);
    const yDivisor = Math.max(1, height - 1);
    const shape = context.config.world.shape ?? 'disc';

    for (let y = 0; y < height; y++) {
      if (signal.aborted) {
        throw new GenerationCancelledError();
      }

      const normalizedY = (2 * y) / yDivisor - 1;

      for (let x = 0; x < width; x++) {
        const normalizedX = (2 * x) / xDivisor - 1;
        const isInsideWorld =
          shape === 'rectangle'
            ? Math.abs(normalizedX) <= 1 && Math.abs(normalizedY) <= 1
            : normalizedX * normalizedX + normalizedY * normalizedY <= 1;
        worldMask[y * width + x] = isInsideWorld ? 1 : 0;
      }

      report((y + 1) / height);
    }

    context.state.worldMask = worldMask;
    return { worldMask };
  }

  validate(state: Readonly<MapState>, config: Readonly<MapConfig>): void {
    const { width, height } = config.world;
    assertStageOutput(state.worldMask, 'uint8', width * height);
  }

  summarize(context: MapContext<MapConfig, MapState>, data: StageData): StageMetrics | undefined {
    const mask = data.worldMask;
    if (!(mask instanceof Uint8Array)) {
      return undefined;
    }

    const { width, height } = context.config.world;
    const cells = width * height;
    let filledCells = 0;

    for (let index = 0; index < mask.length; index++) {
      if (mask[index] === 1) {
        filledCells++;
      }
    }

    return {
      shape: context.config.world.shape ?? 'disc',
      width,
      height,
      cells,
      filledCells,
      coverage: cells === 0 ? 0 : filledCells / cells,
      bytes: mask.byteLength,
    };
  }
}
