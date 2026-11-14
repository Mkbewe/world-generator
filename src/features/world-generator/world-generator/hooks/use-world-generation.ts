import { useCallback, useRef, useState } from 'react';
import type { MapRenderer } from '@renderer';

import { useGenerationSession } from './use-generation-session';
import {
  baseClimateConfigOf,
  type GenerationProgressState,
  geologyConfigOf,
  heightmapConfigOf,
  useBaseClimateFormStore,
  useGeneralFormStore,
  useGenerationProgressStore,
  useGenerationStatisticsStore,
  useGeologyFormStore,
  useHeightmapFormStore,
  useMacroRegionFormStore,
  useMapConfigStore,
  useWorldShapeFormStore,
} from '../../../../stores';
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
  const activeRun = useRef(0);

  const generate = useCallback(async (): Promise<void> => {
    const shapeForm = useWorldShapeFormStore.getState();
    const geologyForm = useGeologyFormStore.getState();
    const built = buildGenerationConfig({
      seed: useGeneralFormStore.getState().seed,
      shape: shapeForm.shape,
      sizeMeters: shapeForm.sizeMeters,
      metersPerSample: shapeForm.metersPerSample,
      macroRegions: useMacroRegionFormStore.getState().regions,
      macroRegionDeformation: useMacroRegionFormStore.getState().deformation,
      baseClimate: baseClimateConfigOf(useBaseClimateFormStore.getState()),
      geology: geologyConfigOf(geologyForm),
      heightmap: heightmapConfigOf(useHeightmapFormStore.getState(), geologyForm.regionCount),
    });
    if ('error' in built) {
      setError(built.error);
      return;
    }

    const { setConfig } = useMapConfigStore.getState();
    const { setProgress } = useGenerationProgressStore.getState();
    const { setResult } = useGenerationStatisticsStore.getState();
    const runId = ++activeRun.current;
    const isActiveRun = (): boolean => activeRun.current === runId;
    const reportProgress = (progress: GenerationProgressState): void => {
      if (isActiveRun()) {
        setProgress(progress);
      }
    };

    setResult(undefined);
    setGenerationRun(runId);
    setError(undefined);
    setIsGenerating(true);

    try {
      const result = await worldGenerationSession.generate(built.config, reportProgress);
      if (!isActiveRun()) {
        return;
      }
      if (!result) {
        setProgress(undefined);
        return;
      }
      setConfig(built.config);
      setResult(result);
    } catch (generationError) {
      if (!isActiveRun()) {
        return;
      }
      const current = useGenerationProgressStore.getState().progress;
      setProgress(current ? { ...current, status: 'failed' } : undefined);
      setError(
        generationError instanceof Error ? generationError.message : 'World generation failed.'
      );
    } finally {
      if (isActiveRun()) {
        setIsGenerating(false);
      }
    }
  }, []);

  return { isGenerating, generationRun, error, onRendererReady, generate };
}
