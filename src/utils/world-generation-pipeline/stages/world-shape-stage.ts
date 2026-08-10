import { GenerationCancelledError } from '../world-generation.errors';
import type { WorldGeneratorConfig } from '../world-generation-config';
import type { WorldGenerationContext } from '../world-generation-context';
import type { WorldGenerationStage } from '../world-generation-stage';
import type { WorldGenerationState } from '../world-generation-state';

export class WorldShapeStage implements WorldGenerationStage<
  WorldGeneratorConfig,
  WorldGenerationState
> {
  readonly id = 'world-shape';
  readonly name = 'World shape generation';

  async execute(
    context: WorldGenerationContext<WorldGeneratorConfig, WorldGenerationState>,
    signal: AbortSignal
  ): Promise<void> {
    const { width, height } = context.config.world;

    if (!Number.isInteger(width) || width <= 0 || !Number.isInteger(height) || height <= 0) {
      throw new RangeError('World width and height must be positive integers.');
    }

    const worldMask = new Uint8Array(width * height);
    const xDivisor = Math.max(1, width - 1);
    const yDivisor = Math.max(1, height - 1);

    for (let y = 0; y < height; y++) {
      if (signal.aborted) {
        throw new GenerationCancelledError();
      }

      const normalizedY = (2 * y) / yDivisor - 1;

      for (let x = 0; x < width; x++) {
        const normalizedX = (2 * x) / xDivisor - 1;
        const isInsideWorld = normalizedX * normalizedX + normalizedY * normalizedY <= 1;
        worldMask[y * width + x] = isInsideWorld ? 1 : 0;
      }
    }

    context.state.worldMask = worldMask;
  }
}
