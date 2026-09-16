import { Flex, Grid, Text } from '@radix-ui/themes';

import { useWorldGeneration } from './use-world-generation';
import {
  useGeneralFormStore,
  useGenerationProgressStore,
  useNoiseFormStore,
  useWorldShapeFormStore,
} from '../../stores';
import { PreviewMap } from '../preview-map';
import { SettingsPanel } from '../settings-panel';

export function WorldGenerator() {
  const seed = useGeneralFormStore(state => state.seed);
  const setSeed = useGeneralFormStore(state => state.setSeed);
  const shape = useWorldShapeFormStore(state => state.shape);
  const sizeMeters = useWorldShapeFormStore(state => state.sizeMeters);
  const metersPerSample = useWorldShapeFormStore(state => state.metersPerSample);
  const setShape = useWorldShapeFormStore(state => state.setShape);
  const setSizeMeters = useWorldShapeFormStore(state => state.setSizeMeters);
  const setMetersPerSample = useWorldShapeFormStore(state => state.setMetersPerSample);
  const noise = useNoiseFormStore(state => state.noise);
  const setNoise = useNoiseFormStore(state => state.setNoise);
  const progress = useGenerationProgressStore(state => state.progress);
  const { isGenerating, generationRun, error, onRendererReady, generate } = useWorldGeneration();

  return (
    <>
      <Grid columns={{ initial: '1', md: '4fr 8fr' }} gap='5' align='start'>
        <SettingsPanel
          seed={seed}
          onSeedChange={setSeed}
          isGenerating={isGenerating}
          onGenerate={generate}
          shape={shape}
          sizeMeters={sizeMeters}
          metersPerSample={metersPerSample}
          onShapeChange={setShape}
          onSizeChange={setSizeMeters}
          onDetailChange={setMetersPerSample}
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
