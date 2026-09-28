import { Flex } from '@radix-ui/themes';

import { useHeightmapFormStore } from '../../../../stores';
import { MAX_RELIEF, MIN_RELIEF } from '../../../../utils/map-generator/stages/heightmap';
import { SliderField } from '../../../slider-field';

export function HeightmapForm() {
  const relief = useHeightmapFormStore(state => state.heightmap.relief);
  const setRelief = useHeightmapFormStore(state => state.setRelief);

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
    </Flex>
  );
}
