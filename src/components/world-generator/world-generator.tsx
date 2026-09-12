import { Flex, Grid, Text } from '@radix-ui/themes';

import { useWorldGeneration } from './use-world-generation';
import {
  useBasicFormStore,
  useGenerationProgressStore,
  useNoiseFormStore,
  useWorldShapeFormStore,
} from '../../stores';
import { PreviewMap } from '../preview-map';
import { SettingsPanel } from '../settings-panel';

export function WorldGenerator() {
  const seed = useBasicFormStore(state => state.seed);
  const setSeed = useBasicFormStore(state => state.setSeed);
  const shape = useWorldShapeFormStore(state => state.shape);
  const size = useWorldShapeFormStore(state => state.size);
  const setShape = useWorldShapeFormStore(state => state.setShape);
  const setSize = useWorldShapeFormStore(state => state.setSize);
  const noise = useNoiseFormStore(state => state.noise);
  const setNoise = useNoiseFormStore(state => state.setNoise);
  const progress = useGenerationProgressStore(state => state.progress);
  const { isGenerating, generationRun, error, onRendererReady, generate } = useWorldGeneration();

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
        <PreviewMap onReady={onRendererReady} progress={progress} progressKey={generationRun} />
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
