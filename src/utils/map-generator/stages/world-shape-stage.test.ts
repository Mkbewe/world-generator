import { WorldShapeStage } from './world-shape-stage';
import { MapGenerator } from '../pipeline';
import type { MapConfig, MapState } from '../types';

describe('WorldShapeStage', () => {
  it('creates a circular mask within the rectangular data grid', async () => {
    const config: MapConfig = {
      world: { width: 5, height: 5, seed: 123 },
      noise: { frequency: 4, octaves: 3, persistence: 0.5, lacunarity: 2 },
    };
    const pipeline = new MapGenerator<MapConfig, MapState>([new WorldShapeStage()]);

    const result = await pipeline.generate(config, {});
    const mask = result.context.state.worldMask!;

    expect(mask).toHaveLength(25);
    expect([mask[0], mask[4], mask[20], mask[24]]).toEqual([0, 0, 0, 0]);
    expect([mask[2], mask[12], mask[22]]).toEqual([1, 1, 1]);
  });
});
