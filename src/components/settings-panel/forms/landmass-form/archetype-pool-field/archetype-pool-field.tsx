import { Button, CheckboxCards, Flex } from '@radix-ui/themes';

import { selectedArchetypes, useLandmassFormStore } from '../../../../../stores';
import { LANDMASS_ARCHETYPES } from '../../../../../utils/map-generator/stages/landmass-archetypes';
import type { LandmassArchetype } from '../../../../../utils/map-generator/types';
import { InfoLabel } from '../../../../info-label';

const ARCHETYPE_LABELS: Record<LandmassArchetype, string> = {
  round: 'Round',
  oval: 'Oval',
  elongated: 'Elongated',
  irregular: 'Irregular',
  o: 'O',
  c: 'C',
  l: 'L',
  u: 'U',
  s: 'S',
  z: 'Z',
  v: 'V',
  y: 'Y',
  x: 'X',
  t: 'T',
};

/** Enables the archetypes the layout may draw a structure from. */
export function ArchetypePoolField() {
  const landmasses = useLandmassFormStore(state => state.landmasses);
  const setArchetypes = useLandmassFormStore(state => state.setArchetypes);
  const selected = selectedArchetypes(landmasses);
  const everyArchetypeSelected = selected.length === LANDMASS_ARCHETYPES.length;

  return (
    <Flex direction='column' gap='2'>
      <Flex justify='between' align='center'>
        <InfoLabel
          label='Shapes'
          description='Archetypes the structures are drawn from. Every structure picks one from the enabled pool, so one world can mix round, elongated and letter shapes. With an empty pool the layout draws no structures at all.'
        />
        <Button
          size='1'
          variant='ghost'
          onClick={() => setArchetypes(everyArchetypeSelected ? [] : LANDMASS_ARCHETYPES)}
        >
          {everyArchetypeSelected ? 'Clear' : 'Select all'}
        </Button>
      </Flex>
      <CheckboxCards.Root
        columns={{ initial: '2', sm: '3' }}
        gap='2'
        size='1'
        value={[...selected]}
        onValueChange={value => setArchetypes(value as LandmassArchetype[])}
      >
        {LANDMASS_ARCHETYPES.map(archetype => (
          <CheckboxCards.Item key={archetype} value={archetype}>
            {ARCHETYPE_LABELS[archetype]}
          </CheckboxCards.Item>
        ))}
      </CheckboxCards.Root>
    </Flex>
  );
}
