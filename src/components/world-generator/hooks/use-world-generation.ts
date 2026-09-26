import { useCallback, useState } from 'react';

import { useGenerationSession } from './use-generation-session';
import {
  useGeneralFormStore,
  useGenerationProgressStore,
  useGenerationStatisticsStore,
  useLandmassFormStore,
  useMacroRegionFormStore,
  useMapConfigStore,
  useNoiseFormStore,
  useStructureCharacterFormStore,
  useWorldShapeFormStore,
} from '../../../stores';
import type { MapRenderer } from '../../../utils/map-renderer';
import { buildGenerationConfig } from '../lib/generation-config';
import { worldGenerationSession } from '../lib/world-generation-session';

export interface WorldGeneration {
  isGenerating: boolean;
  generationRun: number;
  error?: string;
  onRendererReady: (renderer: MapRenderer | undefined) => void;
  generate: () => Promise<void>;
}

/** Wires the generator form to the shared generation session and tracks its run. */
export function useWorldGeneration(): WorldGeneration {
  const { onRendererReady } = useGenerationSession();
  const [isGenerating, setIsGenerating] = useState(
    () => useGenerationProgressStore.getState().progress?.status === 'running'
  );
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
      landmasses: useLandmassFormStore.getState().landmasses,
      structureCharacter: useStructureCharacterFormStore.getState().structureCharacter,
    });
    if ('error' in built) {
      setError(built.error);
      return;
    }

    const { setConfig } = useMapConfigStore.getState();
    const { setProgress } = useGenerationProgressStore.getState();
    const { setResult } = useGenerationStatisticsStore.getState();

    setResult(undefined);
    setGenerationRun(current => current + 1);
    setError(undefined);
    setIsGenerating(true);

    try {
      const result = await worldGenerationSession.generate(built.config, setProgress);
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
  }, []);

  return { isGenerating, generationRun, error, onRendererReady, generate };
}
