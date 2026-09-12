import { useCallback, useRef, useState } from 'react';
import { Flex, Grid, Text } from '@radix-ui/themes';

import { MapGenerationSession } from './map-generation-session';
import { useGenerationStatisticsStore, useMapConfigStore } from '../../stores';
import type { NoiseConfig } from '../../utils/map-generator';
import { type MapRenderer, mapRepository } from '../../utils/map-renderer';
import type { GenerationProgressState } from '../generation-progress';
import { PreviewMap } from '../preview-map';
import { SettingsPanel } from '../settings-panel';
import type { WorldShape, WorldSize } from '../settings-panel/forms';

const DEFAULT_WORLD_SIZE = 1000;
const DEFAULT_NOISE: NoiseConfig = { frequency: 4, octaves: 4, persistence: 0.5, lacunarity: 2 };

export function WorldGenerationPreview() {
  const restoredMap = mapRepository.get();
  const sessionRef = useRef<MapGenerationSession | null>(null);
  const setResult = useGenerationStatisticsStore(state => state.setResult);
  const setConfig = useMapConfigStore(state => state.setConfig);
  const [shape, setShape] = useState<WorldShape>(restoredMap?.shape ?? 'disc');
  const [size, setSize] = useState<WorldSize>(restoredMap?.width ?? DEFAULT_WORLD_SIZE);
  const [seed, setSeed] = useState(restoredMap?.seed ?? '123456');
  const [noise, setNoise] = useState<NoiseConfig>(DEFAULT_NOISE);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationRun, setGenerationRun] = useState(0);
  const [progress, setProgress] = useState<GenerationProgressState>();
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
        return;
      }
      setConfig(config);
      setResult(result);
    } catch (generationError) {
      setProgress(current => (current ? { ...current, status: 'failed' } : undefined));
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
