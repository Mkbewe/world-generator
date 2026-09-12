import { useCallback, useRef, useState } from 'react';
import { Flex, Grid, Text } from '@radix-ui/themes';

import { MapGenerationSession } from './map-generation-session';
import {
  useBasicFormStore,
  useGenerationProgressStore,
  useGenerationStatisticsStore,
  useMapConfigStore,
  useNoiseFormStore,
  useWorldShapeFormStore,
} from '../../stores';
import type { MapRenderer } from '../../utils/map-renderer';
import { PreviewMap } from '../preview-map';
import { SettingsPanel } from '../settings-panel';

export function WorldGenerationPreview() {
  const seed = useBasicFormStore(state => state.seed);
  const setSeed = useBasicFormStore(state => state.setSeed);
  const shape = useWorldShapeFormStore(state => state.shape);
  const size = useWorldShapeFormStore(state => state.size);
  const setShape = useWorldShapeFormStore(state => state.setShape);
  const setSize = useWorldShapeFormStore(state => state.setSize);
  const noise = useNoiseFormStore(state => state.noise);
  const setNoise = useNoiseFormStore(state => state.setNoise);
  const progress = useGenerationProgressStore(state => state.progress);
  const setProgress = useGenerationProgressStore(state => state.setProgress);
  const setResult = useGenerationStatisticsStore(state => state.setResult);
  const setConfig = useMapConfigStore(state => state.setConfig);
  const sessionRef = useRef<MapGenerationSession | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationRun, setGenerationRun] = useState(0);
  const [error, setError] = useState<string>();

  const handleReady = useCallback((renderer: MapRenderer | undefined) => {
    sessionRef.current?.cancel();
    sessionRef.current = renderer ? new MapGenerationSession(renderer) : null;
    sessionRef.current?.restore();
  }, []);

  const generate = async (): Promise<void> => {
    const parsedSeed = Number(seed);
    if (seed.trim() === '' || !Number.isSafeInteger(parsedSeed)) {
      setError('Seed must be an integer.');
      return;
    }
    const session = sessionRef.current;
    if (!session) {
      setError('Preview is not available.');
      return;
    }

    setResult(undefined);
    setGenerationRun(current => current + 1);
    setError(undefined);
    setIsGenerating(true);

    const config = {
      world: { width: size, height: size, seed: parsedSeed, shape },
      noise,
    };

    try {
      const result = await session.generate(config, setProgress);
      if (!result) {
        setProgress(undefined);
        return;
      }
      setConfig(config);
      setResult(result);
    } catch (generationError) {
      const current = useGenerationProgressStore.getState().progress;
      setProgress(current ? { ...current, status: 'failed' } : undefined);
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
          noise={noise}
          onNoiseChange={setNoise}
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
