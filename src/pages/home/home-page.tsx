import { useEffect, useRef, useState } from 'react';

import { useHeaderActions } from '../../components/header';
import { WorldCanvas, type WorldCanvasRef } from '../../components/world-canvas';
import { type GenerationMetrics, WorldControls } from '../../components/world-controls';
import { WorldGenerationPreview } from '../../components/world-generation-preview';
import { useFlag } from '../../feature-flags';
import type { Params } from '../../types/world.types';
import styles from './home-page.module.scss';

export function HomePage() {
  const worldCanvasRef = useRef<WorldCanvasRef>(null);
  const showPipelinePreview = useFlag('pipelinePreview');
  const { exportMapRef, setIsMapGenerated } = useHeaderActions();
  const [isGenerating, setIsGenerating] = useState(false);
  const [useWorker, setUseWorker] = useState(false);
  const [generationMetrics, setGenerationMetrics] = useState<GenerationMetrics>();
  const [generationError, setGenerationError] = useState<string>();
  const [params, setParams] = useState<Params>({
    largeCount: 3,
    mediumCount: 5,
    smallCount: 10,
    islandSize: 100,
    groupChance: 40,
    seaLevel: 0.38,
    roughness: 50,
    seed: '',
  });

  useEffect(() => {
    exportMapRef.current = () => worldCanvasRef.current?.exportMap();
  }, [exportMapRef]);

  const updateParam = <K extends keyof Params>(key: K, value: Params[K]): void => {
    setParams(prev => ({ ...prev, [key]: value }));
  };

  const handleGenerateMap = async (): Promise<void> => {
    setIsGenerating(true);
    setGenerationError(undefined);
    await waitForNextPaint();
    const startedAt = performance.now();

    try {
      const result = await worldCanvasRef.current?.generate(useWorker);
      if (!result) {
        throw new Error('World generator is not available.');
      }

      setGenerationMetrics({
        mode: useWorker ? 'worker' : 'main-thread',
        computeDurationMs: result.computeDurationMs,
        totalDurationMs: performance.now() - startedAt,
        islandCounts: result.islandCounts,
      });
      setIsMapGenerated(true);
    } catch (error) {
      setGenerationError(error instanceof Error ? error.message : 'World generation failed.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className={styles.container}>
      <WorldControls
        params={params}
        updateParam={updateParam}
        generateMap={handleGenerateMap}
        isGenerating={isGenerating}
        useWorker={useWorker}
        onUseWorkerChange={setUseWorker}
        generationMetrics={generationMetrics}
        generationError={generationError}
      />

      <WorldCanvas
        ref={worldCanvasRef}
        params={params}
        onSeedGenerated={newSeed => updateParam('seed', newSeed)}
      />
      {showPipelinePreview && <WorldGenerationPreview />}
    </div>
  );
}

function waitForNextPaint(): Promise<void> {
  return new Promise(resolve => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}
