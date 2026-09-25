import { Button, CheckboxCards, Flex } from '@radix-ui/themes';

import { selectedArchetypes, useLandmassFormStore } from '../../../../../stores';
import {
  LANDMASS_POOL,
  type LandmassPoolArchetype,
} from '../../../../../utils/map-generator/stages/landmass';
import type { LandmassArchetype } from '../../../../../utils/map-generator/types';
import { InfoLabel } from '../../../../info-label';

const ARCHETYPE_LABELS: Record<LandmassPoolArchetype, string> = {
  round: 'Round',
  irregular: 'Irregular',
  elongated: 'Elongated',
  branched: 'Branched',
  lagoon: 'Lagoon',
};

/** Enables the archetypes the layout may draw a structure from. */
export function ArchetypePoolField() {
  const landmasses = useLandmassFormStore(state => state.landmasses);
  const setArchetypes = useLandmassFormStore(state => state.setArchetypes);
  const selected = selectedArchetypes(landmasses);
  const everyArchetypeSelected = selected.length === LANDMASS_POOL.length;

  return (
    <Flex direction='column' gap='2'>
      <Flex justify='between' align='center'>
        <InfoLabel
          label='Shapes'
          description='Shape intents the structures are drawn from. Every structure picks one from the enabled pool, so one world can mix round, elongated and winding forms; at least one intent stays enabled.'
        />
        {everyArchetypeSelected ? null : (
          <Button size='1' variant='ghost' onClick={() => setArchetypes(LANDMASS_POOL)}>
            Select all
          </Button>
        )}
      </Flex>
      <CheckboxCards.Root
        columns={{ initial: '2', sm: '3' }}
        gap='2'
        size='1'
        value={[...selected]}
        onValueChange={value => setArchetypes(value as LandmassArchetype[])}
      >
        {LANDMASS_POOL.map(archetype => (
          <CheckboxCards.Item key={archetype} value={archetype}>
            {ARCHETYPE_LABELS[archetype]}
          </CheckboxCards.Item>
        ))}
      </CheckboxCards.Root>
    </Flex>
  );
}
