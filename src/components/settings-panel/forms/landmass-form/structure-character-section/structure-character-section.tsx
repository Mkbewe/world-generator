import { Flex, Heading, Separator } from '@radix-ui/themes';

import { useStructureCharacterFormStore } from '../../../../../stores';
import {
  MAX_CHARACTER_VARIATION,
  MIN_CHARACTER_VARIATION,
} from '../../../../../utils/map-generator/stages/structure-character';
import { SliderField } from '../../../../slider-field';

export function StructureCharacterSection() {
  const characterVariation = useStructureCharacterFormStore(
    state => state.structureCharacter.characterVariation
  );
  const setCharacterVariation = useStructureCharacterFormStore(
    state => state.setCharacterVariation
  );

  return (
    <Flex direction='column' gap='4'>
      <Separator size='4' />
      <Heading size='3'>Structure character</Heading>
      <SliderField
        label='Character variety'
        description='How often a large structure is split into a second character zone; 0 keeps every island uniform.'
        value={characterVariation}
        min={MIN_CHARACTER_VARIATION}
        max={MAX_CHARACTER_VARIATION}
        step={0.05}
        format={value => `${Math.round(value * 100)}%`}
        rangeLabels={['Uniform', 'Mixed']}
        onChange={setCharacterVariation}
      />
    </Flex>
  );
}
