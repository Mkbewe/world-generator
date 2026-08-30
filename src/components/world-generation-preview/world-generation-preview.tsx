import { useEffect, useRef, useState } from 'react';
import { Flex, Grid, Text } from '@radix-ui/themes';

import {
  createMapGenerator,
  type GenerationEvent,
  type MapConfig,
  PipelineWorkerClient,
  type StageStatistics,
} from '../../utils/map-generator';
import { GenerationForm } from '../generation-form';
import { GenerationStatistics } from '../generation-statistics';
import { PreviewMap } from '../preview-map';

const PREVIEW_SIZE = 300;

const pipeline = createMapGenerator();

interface PreviewGenerationResult {
  worldMask?: Uint8Array;
  noiseMap?: Float32Array;
  statistics: readonly StageStatistics[];
  totalDurationMs: number;
}

interface PreviewState {
  statistics: readonly StageStatistics[];
  totalDurationMs?: number;
  valueRange?: { min: number; max: number };
}

export function WorldGenerationPreview() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const workerClientRef = useRef<PipelineWorkerClient | null>(null);
  const [useWorker, setUseWorker] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [seed, setSeed] = useState('12345');
  const [preview, setPreview] = useState<PreviewState>({ statistics: [] });
  const [error, setError] = useState<string>();

  useEffect(() => {
    return () => workerClientRef.current?.dispose();
  }, []);

  const getWorkerClient = (): PipelineWorkerClient => {
    if (!workerClientRef.current) {
      workerClientRef.current = new PipelineWorkerClient();
    }

    return workerClientRef.current;
  };

  const handleGenerationEvent = (event: GenerationEvent): void => {
    if (event.type !== 'stage-completed') {
      return;
    }

    setPreview(current => {
      const statistics = current.statistics.filter(
        item => item.stageId !== event.statistics.stageId
      );
      statistics.push(event.statistics);
      return { ...current, statistics };
    });
  };

  const generate = async (): Promise<void> => {
    const parsedSeed = Number(seed);

    if (seed.trim() === '' || !Number.isSafeInteger(parsedSeed)) {
      setError('Seed must be an integer.');
      return;
    }

    setError(undefined);
    setIsGenerating(true);

    const config: MapConfig = {
      world: { width: PREVIEW_SIZE, height: PREVIEW_SIZE, seed: parsedSeed },
      noise: { frequency: 4, octaves: 4, persistence: 0.5, lacunarity: 2 },
    };

    try {
      const result: PreviewGenerationResult = useWorker
        ? await getWorkerClient().generate(config, { onEvent: handleGenerationEvent })
        : await pipeline
            .generate(config, {}, { onEvent: handleGenerationEvent })
            .then(generation => ({
              worldMask: generation.context.state.worldMask,
              noiseMap: generation.context.state.noiseMap,
              statistics: generation.statistics,
              totalDurationMs: generation.totalDurationMs,
            }));

      const { noiseMap, worldMask } = result;
      const canvas = canvasRef.current;
      const context = canvas?.getContext('2d');

      if (!noiseMap || !worldMask) {
        setError('Pipeline completed without world mask or noise map.');
        return;
      }

      if (!context) {
        setError('Canvas is not available.');
        return;
      }

      const imageData = context.createImageData(PREVIEW_SIZE, PREVIEW_SIZE);
      let min = Number.POSITIVE_INFINITY;
      let max = Number.NEGATIVE_INFINITY;

      for (let index = 0; index < noiseMap.length; index++) {
        if (worldMask[index] === 0) {
          continue;
        }

        const value = noiseMap[index];
        const color = Math.round(value * 255);
        const pixelIndex = index * 4;

        imageData.data[pixelIndex] = color;
        imageData.data[pixelIndex + 1] = color;
        imageData.data[pixelIndex + 2] = color;
        imageData.data[pixelIndex + 3] = 255;
        min = Math.min(min, value);
        max = Math.max(max, value);
      }

      context.putImageData(imageData, 0, 0);
      setPreview({
        statistics: result.statistics,
        totalDurationMs: result.totalDurationMs,
        valueRange: Number.isFinite(min) ? { min, max } : undefined,
      });
    } catch (generationError) {
      setError(
        generationError instanceof Error ? generationError.message : 'World generation failed.'
      );
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <>
      <Grid columns={{ initial: '1', md: '3fr 6fr 3fr' }} gap='7'>
        <GenerationForm
          seed={seed}
          onSeedChange={setSeed}
          useWorker={useWorker}
          onUseWorkerChange={setUseWorker}
          isGenerating={isGenerating}
          onGenerate={generate}
        />

        <PreviewMap
          width={PREVIEW_SIZE}
          height={PREVIEW_SIZE}
          canvasRef={canvasRef}
          label='Generated noise preview'
        />

        <GenerationStatistics
          stages={pipeline.stages}
          statistics={preview.statistics}
          totalDurationMs={preview.totalDurationMs}
          valueRange={preview.valueRange}
        />
      </Grid>

      {error && (
        <Flex justify='center'>
          <Text size='2' color='red' role='alert'>
            {error}
          </Text>
        </Flex>
      )}
    </>
  );
}
