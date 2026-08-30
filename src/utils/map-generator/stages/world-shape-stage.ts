import type { MapContext } from '../context';
import { GenerationCancelledError } from '../errors';
import type { MapStage } from '../stage';
import type { MapConfig, MapState } from '../types';

export class WorldShapeStage implements MapStage<MapConfig, MapState> {
  readonly id = 'world-shape';
  readonly name = 'World shape generation';

  async execute(context: MapContext<MapConfig, MapState>, signal: AbortSignal): Promise<void> {
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
