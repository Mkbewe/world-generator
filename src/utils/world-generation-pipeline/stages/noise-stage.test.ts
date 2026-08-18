import type { WorldGeneratorConfig } from '../world-generation-config';
import { createWorldGenerationPipeline } from '../world-generation-pipeline-factory';

function createConfig(width = 5, height = 5, seed = 123): WorldGeneratorConfig {
  return {
    world: { width, height, seed },
    noise: { frequency: 4, octaves: 3, persistence: 0.5, lacunarity: 2 },
  };
}

async function generateNoise(config: WorldGeneratorConfig): Promise<Float32Array> {
  const pipeline = createWorldGenerationPipeline();
  const result = await pipeline.generate(config, {});

  return result.context.state.noiseMap!;
}

describe('NoiseStage', () => {
  it('generates one normalized noise value per world cell', async () => {
    const noiseMap = await generateNoise(createConfig(8, 6));

    expect(noiseMap).toHaveLength(48);
    expect(noiseMap.every(value => value >= 0 && value <= 1)).toBe(true);
    expect(noiseMap[0]).toBe(0);
  });

  it('generates the same noise for the same seed and configuration', async () => {
    const first = await generateNoise(createConfig());
    const second = await generateNoise(createConfig());

    expect(second).toEqual(first);
  });

  it('generates different noise for a different seed', async () => {
    const first = await generateNoise(createConfig(5, 5, 123));
    const second = await generateNoise(createConfig(5, 5, 456));

    expect(second).not.toEqual(first);
  });

  it('samples the same world coordinates consistently at different resolutions', async () => {
    const lowResolution = await generateNoise(createConfig(3, 3));
    const highResolution = await generateNoise(createConfig(5, 5));

    for (let lowY = 0; lowY < 3; lowY++) {
      for (let lowX = 0; lowX < 3; lowX++) {
        const lowValue = lowResolution[lowY * 3 + lowX];
        const highValue = highResolution[lowY * 2 * 5 + lowX * 2];

        expect(highValue).toBeCloseTo(lowValue, 6);
      }
    }
  });

  it('rejects invalid generation settings', async () => {
    const config = createConfig();
    config.noise.octaves = 0;

    await expect(generateNoise(config)).rejects.toMatchObject({
      name: 'GenerationStageError',
      stageId: 'noise',
      cause: expect.any(RangeError),
    });
  });
});
