import { useEffect, useRef, useState } from 'react';
import { Flex, Grid, Text } from '@radix-ui/themes';

import { useGenerationStatisticsStore } from '../../stores';
import {
  createMapGenerator,
  type GenerationEvent,
  type MapConfig,
  PipelineWorkerClient,
  type StageStatistics,
} from '../../utils/map-generator';
import type { GenerationProgressState } from '../generation-progress';
import { PreviewMap } from '../preview-map';
import { SettingsPanel } from '../settings-panel';

const PREVIEW_SIZE = 300;
const NOISE_STAGE_ID = 'noise';

const pipeline = createMapGenerator();

interface PreviewGenerationResult {
  worldMask?: Uint8Array;
  noiseMap?: Float32Array;
  statistics: readonly StageStatistics[];
  totalDurationMs: number;
}

function withNoiseDetails(
  statistics: readonly StageStatistics[],
  valueRange: { min: number; max: number } | undefined
): readonly StageStatistics[] {
  if (!valueRange) {
    return statistics;
  }

  return statistics.map(item =>
    item.stageId === NOISE_STAGE_ID
      ? { ...item, details: { min: valueRange.min, max: valueRange.max } }
      : item
  );
}

export function WorldGenerationPreview() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const workerClientRef = useRef<PipelineWorkerClient | null>(null);
  const setResult = useGenerationStatisticsStore(state => state.setResult);
  const [useWorker, setUseWorker] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState<GenerationProgressState>();
  const [seed, setSeed] = useState('12345');
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

  const generate = async (): Promise<void> => {
    const parsedSeed = Number(seed);

    if (seed.trim() === '' || !Number.isSafeInteger(parsedSeed)) {
      setError('Seed must be an integer.');
      return;
    }

    setError(undefined);
    setIsGenerating(true);
    setProgress({
      stageName: 'Preparing generation...',
      stageIndex: 0,
      stageCount: 0,
      percentage: 0,
      status: 'running',
    });

    await waitForNextPaint();

    const onGenerationEvent = (event: GenerationEvent): void => {
      setProgress({
        stageName: event.stageName,
        stageIndex: event.stageIndex,
        stageCount: event.stageCount,
        percentage: event.type === 'stage-completed' ? 100 : 0,
        status: 'running',
      });
    };

    const config: MapConfig = {
      world: { width: PREVIEW_SIZE, height: PREVIEW_SIZE, seed: parsedSeed },
      noise: { frequency: 4, octaves: 4, persistence: 0.5, lacunarity: 2 },
    };

    try {
      const result: PreviewGenerationResult = useWorker
        ? await getWorkerClient().generate(config, { onEvent: onGenerationEvent })
        : await pipeline.generate(config, {}, { onEvent: onGenerationEvent }).then(generation => ({
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
      setResult({
        statistics: withNoiseDetails(
          result.statistics,
          Number.isFinite(min) ? { min, max } : undefined
        ),
        totalDurationMs: result.totalDurationMs,
      });
      setProgress(currentProgress =>
        currentProgress
          ? {
              ...currentProgress,
              stageName: 'Generation complete',
              percentage: 100,
              status: 'completed',
            }
          : undefined
      );
    } catch (generationError) {
      setProgress(currentProgress => ({
        stageName: 'Generation failed',
        stageIndex: currentProgress?.stageIndex ?? 0,
        stageCount: currentProgress?.stageCount ?? 0,
        percentage: currentProgress?.percentage ?? 0,
        status: 'failed',
      }));
      setError(
        generationError instanceof Error ? generationError.message : 'World generation failed.'
      );
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <>
      <Grid columns={{ initial: '1', md: '4fr 8fr' }} gap='7'>
        <SettingsPanel
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
          progress={progress}
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

function waitForNextPaint(): Promise<void> {
  return new Promise(resolve => requestAnimationFrame(() => resolve()));
}
