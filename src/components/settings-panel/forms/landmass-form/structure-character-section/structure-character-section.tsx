import { Flex, Heading, Separator } from '@radix-ui/themes';

import { useStructureCharacterFormStore } from '../../../../../stores';
import {
  MAX_CHARACTER_VARIATION,
  MAX_TERRAIN_BIAS,
  MIN_CHARACTER_VARIATION,
  MIN_TERRAIN_BIAS,
} from '../../../../../utils/map-generator/stages/structure-character';
import { SliderField } from '../../../../slider-field';

export function StructureCharacterSection() {
  const characterVariation = useStructureCharacterFormStore(
    state => state.structureCharacter.characterVariation
  );
  const setCharacterVariation = useStructureCharacterFormStore(
    state => state.setCharacterVariation
  );
  const terrainBias = useStructureCharacterFormStore(state => state.structureCharacter.terrainBias);
  const setTerrainBias = useStructureCharacterFormStore(state => state.setTerrainBias);

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
      <SliderField
        label='Terrain bias'
        description='Leans islands from flat plains to mountains; the middle keeps every allowed character equally likely.'
        value={terrainBias}
        min={MIN_TERRAIN_BIAS}
        max={MAX_TERRAIN_BIAS}
        step={0.05}
        format={value => `${Math.round(value * 100)}%`}
        rangeLabels={['Flat', 'Mountainous']}
        onChange={setTerrainBias}
      />
    </Flex>
  );
}
