import { useEffect, useRef, useState } from 'react';
import { Flex, Grid, Text } from '@radix-ui/themes';

import { useGenerationStatisticsStore } from '../../stores';
import {
  type GenerationEvent,
  type MapConfig,
  PipelineWorkerClient,
  type StageStatistics,
} from '../../utils/map-generator';
import {
  type AvailablePreviewMapLayers,
  cacheGeneratedMap,
  createMapRevision,
  getGeneratedMapSnapshot,
  type MapBaseLayerId,
  type PreviewMapLayers,
} from '../../utils/map-preview';
import type { GenerationProgressState } from '../generation-progress';
import { PreviewMap } from '../preview-map';
import { SettingsPanel } from '../settings-panel';
import type { WorldShape, WorldSize } from '../settings-panel/forms';

const DEFAULT_WORLD_SIZE = 1000;
const NOISE_STAGE_ID = 'noise';
const MIN_STAGE_LAYER_VISIBILITY_MS = 200;

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
  const restoredMap = getGeneratedMapSnapshot();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const workerClientRef = useRef<PipelineWorkerClient | null>(null);
  const automaticLayerTimerRef = useRef<number | undefined>(undefined);
  const worldShapeSelectedAtRef = useRef(0);
  const layersRef = useRef<PreviewMapLayers>(restoredMap?.layers ?? {});
  const setResult = useGenerationStatisticsStore(state => state.setResult);
  const [shape, setShape] = useState<WorldShape>(restoredMap?.shape ?? 'disc');
  const [size, setSize] = useState<WorldSize>(restoredMap?.size ?? DEFAULT_WORLD_SIZE);
  const [renderedSize, setRenderedSize] = useState(restoredMap?.size ?? DEFAULT_WORLD_SIZE);
  const [layerRevision, setLayerRevision] = useState(restoredMap?.revision ?? 0);
  const [availableLayers, setAvailableLayers] = useState<AvailablePreviewMapLayers>(
    restoredMap ? { worldMask: true, noiseMap: true } : {}
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationRun, setGenerationRun] = useState(0);
  const [selectedBaseLayer, setSelectedBaseLayer] = useState<MapBaseLayerId>('world-shape');
  const [progress, setProgress] = useState<GenerationProgressState>();
  const [seed, setSeed] = useState(restoredMap?.seed ?? '123456');
  const [error, setError] = useState<string>();

  useEffect(() => {
    return () => {
      workerClientRef.current?.dispose();
      if (automaticLayerTimerRef.current !== undefined) {
        clearTimeout(automaticLayerTimerRef.current);
      }
    };
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
    setGenerationRun(run => run + 1);
    if (automaticLayerTimerRef.current !== undefined) {
      clearTimeout(automaticLayerTimerRef.current);
      automaticLayerTimerRef.current = undefined;
    }
    layersRef.current = {};
    setAvailableLayers({});
    worldShapeSelectedAtRef.current = performance.now();
    setSelectedBaseLayer('world-shape');
    setProgress({
      stageName: 'Preparing generation...',
      stageIndex: 0,
      stageCount: 0,
      percentage: 0,
      status: 'running',
    });

    await waitForNextPaint();

    const onGenerationEvent = (event: GenerationEvent): void => {
      if (event.type === 'stage-completed' && event.stageId === 'world-shape') {
        const worldMask = event.data.worldMask;
        if (worldMask instanceof Uint8Array) {
          layersRef.current = { worldMask };
          setAvailableLayers({ worldMask: true });
          setRenderedSize(size);
          setLayerRevision(createMapRevision());
        }
        worldShapeSelectedAtRef.current = performance.now();
        setSelectedBaseLayer('world-shape');
      }

      if (event.type === 'stage-completed' && event.stageId === 'noise') {
        const noiseMap = event.data.noiseMap;
        if (noiseMap instanceof Float32Array && layersRef.current.worldMask) {
          layersRef.current = { ...layersRef.current, noiseMap };
          setAvailableLayers({ worldMask: true, noiseMap: true });
          setLayerRevision(createMapRevision());
        }

        const visibleForMs = performance.now() - worldShapeSelectedAtRef.current;
        const remainingMs = Math.max(0, MIN_STAGE_LAYER_VISIBILITY_MS - visibleForMs);

        automaticLayerTimerRef.current = window.setTimeout(() => {
          automaticLayerTimerRef.current = undefined;
          setSelectedBaseLayer('noise');
        }, remainingMs);
      }

      setProgress({
        stageName: event.stageName,
        stageIndex: event.stageIndex,
        stageCount: event.stageCount,
        percentage: event.type === 'stage-completed' ? 100 : 0,
        status: 'running',
      });
    };

    const config: MapConfig = {
      world: {
        width: size,
        height: size,
        seed: parsedSeed,
        shape,
      },
      noise: { frequency: 4, octaves: 4, persistence: 0.5, lacunarity: 2 },
    };

    try {
      const result: PreviewGenerationResult = await getWorkerClient().generate(config, {
        onEvent: onGenerationEvent,
      });
      const { noiseMap, worldMask } = result;
      const canvas = canvasRef.current;

      if (!noiseMap || !worldMask) {
        setError('Pipeline completed without world mask or noise map.');
        return;
      }

      if (!canvas?.getContext('2d')) {
        setError('Canvas is not available.');
        return;
      }

      let min = Number.POSITIVE_INFINITY;
      let max = Number.NEGATIVE_INFINITY;

      for (let index = 0; index < noiseMap.length; index++) {
        if (worldMask[index] === 0) {
          continue;
        }

        const value = noiseMap[index];
        min = Math.min(min, value);
        max = Math.max(max, value);
      }

      const cachedMap = cacheGeneratedMap({
        layers: { worldMask, noiseMap },
        width: size,
        height: size,
        seed,
        shape,
        size,
      });
      layersRef.current = cachedMap.layers;
      setAvailableLayers({ worldMask: true, noiseMap: true });
      setRenderedSize(size);
      setLayerRevision(cachedMap.revision);
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
          isGenerating={isGenerating}
          onGenerate={generate}
          shape={shape}
          size={size}
          onShapeChange={setShape}
          onSizeChange={setSize}
        />

        <PreviewMap
          width={renderedSize}
          height={renderedSize}
          canvasRef={canvasRef}
          label='Generated noise preview'
          layersRef={layersRef}
          availableLayers={availableLayers}
          layerRevision={layerRevision}
          baseLayer={selectedBaseLayer}
          onBaseLayerChange={setSelectedBaseLayer}
          progress={progress}
          progressKey={generationRun}
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
