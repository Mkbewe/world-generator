import { Flex } from '@radix-ui/themes';

import { ShelfSection } from './shelf-section';
import { useHeightmapFormStore } from '../../../../stores';
import { MAX_RELIEF, MIN_RELIEF } from '../../../../utils/map-generator/stages/heightmap';
import { SliderField } from '../../../slider-field';

export function HeightmapForm() {
  const relief = useHeightmapFormStore(state => state.heightmap.relief);
  const setRelief = useHeightmapFormStore(state => state.setRelief);
  const featureScale = useHeightmapFormStore(state => state.heightmap.featureScale);
  const setFeatureScale = useHeightmapFormStore(state => state.setFeatureScale);

  return (
    <Flex direction='column' gap='4'>
      <SliderField
        label='Relief'
        description='How high the land rises: 0 keeps islands flat, 1 builds steep mountains.'
        value={relief}
        min={MIN_RELIEF}
        max={MAX_RELIEF}
        step={0.05}
        format={value => `${Math.round(value * 100)}%`}
        rangeLabels={['Flat', 'Mountainous']}
        onChange={setRelief}
      />
      <SliderField
        label='Feature scale'
        description='Size of the terrain forms: small makes fine detail, large makes broad regions.'
        value={featureScale}
        min={MIN_RELIEF}
        max={MAX_RELIEF}
        step={0.05}
        format={value => `${Math.round(value * 100)}%`}
        rangeLabels={['Fine', 'Broad']}
        onChange={setFeatureScale}
      />
      <ShelfSection />
    </Flex>
  );
}
