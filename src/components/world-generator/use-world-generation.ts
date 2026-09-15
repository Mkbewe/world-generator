import { useCallback, useRef, useState } from 'react';

import { WorldGenerationSession } from './world-generation-session';
import {
  useGeneralFormStore,
  useGenerationProgressStore,
  useGenerationStatisticsStore,
  useMacroRegionFormStore,
  useMapConfigStore,
  useNoiseFormStore,
  useWorldShapeFormStore,
} from '../../stores';
import { summarizeWorldGrid } from '../../utils/map-generator/world-grid';
import type { MapRenderer } from '../../utils/map-renderer';
import { restartProgress } from '../generation-progress';

export interface WorldGeneration {
  isGenerating: boolean;
  generationRun: number;
  error?: string;
  onRendererReady: (renderer: MapRenderer | undefined) => void;
  generate: () => Promise<void>;
}

/** Wires the generator form to the worker session and tracks the run state. */
export function useWorldGeneration(): WorldGeneration {
  const seed = useGeneralFormStore(state => state.seed);
  const shape = useWorldShapeFormStore(state => state.shape);
  const sizeMeters = useWorldShapeFormStore(state => state.sizeMeters);
  const metersPerSample = useWorldShapeFormStore(state => state.metersPerSample);
  const noise = useNoiseFormStore(state => state.noise);
  const macroRegions = useMacroRegionFormStore(state => state.regions);
  const macroRegionDeformation = useMacroRegionFormStore(state => state.deformation);
  const setProgress = useGenerationProgressStore(state => state.setProgress);
  const setResult = useGenerationStatisticsStore(state => state.setResult);
  const setConfig = useMapConfigStore(state => state.setConfig);
  const sessionRef = useRef<WorldGenerationSession | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationRun, setGenerationRun] = useState(0);
  const [error, setError] = useState<string>();

  const onRendererReady = useCallback((renderer: MapRenderer | undefined) => {
    sessionRef.current?.cancel();
    sessionRef.current = renderer ? new WorldGenerationSession(renderer) : null;
    sessionRef.current?.restore();
  }, []);

  const generate = useCallback(async (): Promise<void> => {
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
    const previousProgress = useGenerationProgressStore.getState().progress;
    setProgress(previousProgress ? restartProgress(previousProgress) : undefined);

    const grid = summarizeWorldGrid(sizeMeters, metersPerSample);
    const config = {
      world: {
        width: grid.dimensions.sampleWidth,
        height: grid.dimensions.sampleHeight,
        metersPerSample: grid.metersPerSample,
        seed: parsedSeed,
        shape,
      },
      noise,
      macroRegions,
      macroRegionDeformation,
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
  }, [
    macroRegionDeformation,
    macroRegions,
    metersPerSample,
    noise,
    seed,
    setConfig,
    setProgress,
    setResult,
    shape,
    sizeMeters,
  ]);

  return { isGenerating, generationRun, error, onRendererReady, generate };
}
