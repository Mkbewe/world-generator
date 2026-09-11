import { useCallback, useRef, useState } from 'react';
import { Flex, Grid, Text } from '@radix-ui/themes';

import { generateMap } from './generate-map';
import { useGenerationStatisticsStore } from '../../stores';
import {
  clearGeneratedMap,
  getGeneratedMapSnapshot,
  type MapRenderer,
} from '../../utils/map-renderer';
import type { GenerationProgressState } from '../generation-progress';
import { PreviewMap } from '../preview-map';
import { SettingsPanel } from '../settings-panel';
import type { WorldShape, WorldSize } from '../settings-panel/forms';

const DEFAULT_WORLD_SIZE = 1000;

export function WorldGenerationPreview() {
  const restoredMap = getGeneratedMapSnapshot();
  const previewRef = useRef<MapRenderer | null>(null);
  const runRef = useRef(0);
  const setResult = useGenerationStatisticsStore(state => state.setResult);
  const [shape, setShape] = useState<WorldShape>(restoredMap?.shape ?? 'disc');
  const [size, setSize] = useState<WorldSize>(restoredMap?.size ?? DEFAULT_WORLD_SIZE);
  const [seed, setSeed] = useState(restoredMap?.seed ?? '123456');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationRun, setGenerationRun] = useState(0);
  const [progress, setProgress] = useState<GenerationProgressState>();
  const [error, setError] = useState<string>();

  const handleReady = useCallback((renderer: MapRenderer | undefined) => {
    previewRef.current = renderer ?? null;
    const restored = getGeneratedMapSnapshot();
    if (renderer && restored) {
      renderer.restore(restored);
    }
  }, []);

  const generate = (): void => {
    const parsedSeed = Number(seed);
    if (seed.trim() === '' || !Number.isSafeInteger(parsedSeed)) {
      setError('Seed must be an integer.');
      return;
    }
    const preview = previewRef.current;
    if (!preview) {
      setError('Preview is not available.');
      return;
    }

    const run = ++runRef.current;
    clearGeneratedMap();
    setResult({ statistics: [], totalDurationMs: undefined });
    setGenerationRun(current => current + 1);
    setProgress(undefined);
    setError(undefined);
    setIsGenerating(true);

    const config = {
      world: { width: size, height: size, seed: parsedSeed, shape },
      noise: { frequency: 4, octaves: 4, persistence: 0.5, lacunarity: 2 },
    };

    preview.start(config.world);
    setProgress({
      stageName: 'Preparing generation...',
      stageIndex: 0,
      stageCount: 0,
      percentage: 0,
      status: 'running',
    });

    void generateMap(config, preview, setProgress)
      .then(result => {
        if (runRef.current !== run) {
          return;
        }
        setResult({ statistics: result.statistics, totalDurationMs: result.totalDurationMs });
        setProgress({
          stageName: 'Generation complete',
          stageIndex: Math.max(0, result.statistics.length - 1),
          stageCount: result.statistics.length,
          percentage: 100,
          status: 'completed',
        });
        setIsGenerating(false);
      })
      .catch((generationError: unknown) => {
        if (runRef.current !== run) {
          return;
        }
        setProgress(current => ({
          stageName: 'Generation failed',
          stageIndex: current?.stageIndex ?? 0,
          stageCount: current?.stageCount ?? 0,
          percentage: current?.percentage ?? 0,
          status: 'failed',
        }));
        setError(
          generationError instanceof Error ? generationError.message : 'World generation failed.'
        );
        setIsGenerating(false);
      });
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
        <PreviewMap onReady={handleReady} progress={progress} progressKey={generationRun} />
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
