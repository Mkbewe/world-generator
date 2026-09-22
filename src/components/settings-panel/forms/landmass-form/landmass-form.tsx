import { Flex } from '@radix-ui/themes';

import { ArchetypePoolField } from './archetype-pool-field';
import { useLandmassFormStore } from '../../../../stores';
import {
  MAX_LANDMASS_SIZE,
  MAX_LANDMASSES,
  MIN_LANDMASS_SIZE,
} from '../../../../utils/map-generator/stages/landmass-defaults';
import { SliderField } from '../../../slider-field';

export function LandmassForm() {
  const landmasses = useLandmassFormStore(state => state.landmasses);
  const setCount = useLandmassFormStore(state => state.setCount);
  const setSize = useLandmassFormStore(state => state.setSize);

  return (
    <Flex direction='column' gap='4'>
      <SliderField
        label='Structures'
        description='How many independent landmasses the layout places in the world.'
        value={landmasses.count}
        min={1}
        max={MAX_LANDMASSES}
        step={1}
        format={value => String(value)}
        onChange={setCount}
      />
      <SliderField
        label='Size'
        description='How large a structure is drawn: small, medium or big.'
        value={landmasses.size}
        min={MIN_LANDMASS_SIZE}
        max={MAX_LANDMASS_SIZE}
        step={0.05}
        format={value => value.toFixed(2)}
        rangeLabels={['Small', 'Big']}
        onChange={setSize}
      />
      <ArchetypePoolField />
    </Flex>
  );
}
