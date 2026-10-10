import { useRef, useState } from 'react';
import { Grid } from '@radix-ui/themes';

import { ExportDialog } from '../../components/export-dialog';
import type { Params } from '../../legacy-generator/types';
import { WorldCanvas, type WorldCanvasRef } from '../../legacy-generator/world-canvas';
import { type GenerationMetrics, WorldControls } from '../../legacy-generator/world-controls';

export function LegacyGeneratorPage() {
  const worldCanvasRef = useRef<WorldCanvasRef>(null);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [isMapGenerated, setIsMapGenerated] = useState(false);
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
    <>
      <Grid columns={{ initial: '1', md: 'minmax(280px, auto) 1fr' }} gap='7'>
        <WorldControls
          params={params}
          updateParam={updateParam}
          generateMap={handleGenerateMap}
          isGenerating={isGenerating}
          useWorker={useWorker}
          onUseWorkerChange={setUseWorker}
          onExport={() => setIsExportDialogOpen(true)}
          canExport={isMapGenerated}
          generationMetrics={generationMetrics}
          generationError={generationError}
        />

        <WorldCanvas
          ref={worldCanvasRef}
          params={params}
          onSeedGenerated={newSeed => updateParam('seed', newSeed)}
        />
      </Grid>
      <ExportDialog
        isOpen={isExportDialogOpen}
        onOpenChange={setIsExportDialogOpen}
        title='Export World Map'
        description='Download the current world map as a PNG image?'
        formats={[{ id: 'png', label: 'PNG image' }]}
        onExport={() => worldCanvasRef.current?.exportMap()}
      />
    </>
  );
}

function waitForNextPaint(): Promise<void> {
  return new Promise(resolve => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}
