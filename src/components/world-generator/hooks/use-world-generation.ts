import { useCallback, useState } from 'react';

import { useGenerationSession } from './use-generation-session';
import {
  useGeneralFormStore,
  useGenerationProgressStore,
  useGenerationStatisticsStore,
  useMacroRegionFormStore,
  useMapConfigStore,
  useNoiseFormStore,
  useWorldShapeFormStore,
} from '../../../stores';
import type { MapRenderer } from '../../../utils/map-renderer';
import { restartProgress } from '../../generation-progress';
import { buildGenerationConfig } from '../lib/generation-config';

export interface WorldGeneration {
  isGenerating: boolean;
  generationRun: number;
  error?: string;
  onRendererReady: (renderer: MapRenderer | undefined) => void;
  generate: () => Promise<void>;
}

/** Wires the generator form to the worker session and tracks the run state. */
export function useWorldGeneration(): WorldGeneration {
  const { sessionRef, onRendererReady } = useGenerationSession();
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationRun, setGenerationRun] = useState(0);
  const [error, setError] = useState<string>();

  const generate = useCallback(async (): Promise<void> => {
    const shapeForm = useWorldShapeFormStore.getState();
    const built = buildGenerationConfig({
      seed: useGeneralFormStore.getState().seed,
      shape: shapeForm.shape,
      sizeMeters: shapeForm.sizeMeters,
      metersPerSample: shapeForm.metersPerSample,
      noise: useNoiseFormStore.getState().noise,
      macroRegions: useMacroRegionFormStore.getState().regions,
      macroRegionDeformation: useMacroRegionFormStore.getState().deformation,
    });
    if ('error' in built) {
      setError(built.error);
      return;
    }

    const session = sessionRef.current;
    if (!session) {
      setError('Preview is not available.');
      return;
    }

    const { setConfig } = useMapConfigStore.getState();
    const { setProgress } = useGenerationProgressStore.getState();
    const { setResult } = useGenerationStatisticsStore.getState();

    setResult(undefined);
    setGenerationRun(current => current + 1);
    setError(undefined);
    setIsGenerating(true);
    const previousProgress = useGenerationProgressStore.getState().progress;
    setProgress(previousProgress ? restartProgress(previousProgress) : undefined);

    try {
      const result = await session.generate(built.config, setProgress);
      if (!result) {
        setProgress(undefined);
        return;
      }
      setConfig(built.config);
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
  }, [sessionRef]);

  return { isGenerating, generationRun, error, onRendererReady, generate };
}
