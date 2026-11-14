import { useMemo } from 'react';
import { Flex, Grid, Text } from '@radix-ui/themes';

import { useWorldGeneration } from './hooks/use-world-generation';
import { useHeaderActions } from '../../../components/header';
import { useGenerationProgressStore } from '../../../stores';
import { buildProgressViewModel } from '../generation-progress';
import { MapPreview } from '../map-preview';
import { SettingsPanel } from '../settings/settings-panel';

export function WorldGenerator() {
  const progressSource = useGenerationProgressStore(state => state.progress);
  const progress = useMemo(
    () => (progressSource ? buildProgressViewModel(progressSource) : undefined),
    [progressSource]
  );
  const { isGenerating, generationRun, error, onRendererReady, generate } = useWorldGeneration();
  const { isFullscreen } = useHeaderActions();

  return (
    <>
      <Grid columns={{ initial: '1', md: '4fr 8fr' }} gap='5' align='start'>
        <div inert={isFullscreen || undefined}>
          <SettingsPanel isGenerating={isGenerating} onGenerate={generate} />
        </div>
        <MapPreview onReady={onRendererReady} progress={progress} progressKey={generationRun} />
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
