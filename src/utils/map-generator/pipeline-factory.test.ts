import { createMapGenerator } from './pipeline-factory';
import type { MapConfig } from './types';

describe('createMapGenerator', () => {
  it('creates the current world-generation stages in order', async () => {
    const pipeline = createMapGenerator();

    expect(pipeline.stages.map(stage => stage.id)).toEqual(['world-shape', 'noise']);

    const config: MapConfig = {
      world: { width: 5, height: 5, seed: 123 },
      noise: { frequency: 4, octaves: 3, persistence: 0.5, lacunarity: 2 },
    };

    const result = await pipeline.generate(config, {});

    expect(result.statistics.map(statistic => statistic.stageId)).toEqual(['world-shape', 'noise']);
    expect(result.context.state.worldMask).toBeInstanceOf(Uint8Array);
    expect(result.context.state.noiseMap).toBeInstanceOf(Float32Array);
  });
});
