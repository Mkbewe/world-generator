import { Button, Card, Flex, RadioCards, Text } from '@radix-ui/themes';

import { AreaCard } from './area-card';
import { useGeologyFormStore } from '../../../../stores';
import {
  GEOGRAPHY_PRESETS,
  type GeographyPresetId,
  type GeologicalAreaPresetId,
  MAX_GEOLOGICAL_AREAS,
  placementProblemAreaIds,
} from '../../../../utils/map-generator/stages/geology';

const PRESET_LABELS: Record<GeographyPresetId, string> = {
  archipelago: 'Archipelago',
  'volcanic-chain': 'Volcanic chain',
  'atoll-ring': 'Atoll ring',
};

const PRESETS: readonly { readonly id: GeographyPresetId; readonly label: string }[] = (
  Object.keys(GEOGRAPHY_PRESETS) as readonly GeographyPresetId[]
).map(id => ({ id, label: PRESET_LABELS[id] }));

const ADD_PRESETS: readonly { readonly id: GeologicalAreaPresetId; readonly label: string }[] = [
  { id: 'shallow-archipelago', label: 'Shallow' },
  { id: 'volcanic', label: 'Volcanic' },
  { id: 'atoll', label: 'Atoll' },
];

interface GeologyFormProps {
  /** Latest generation error; placement failures mark the offending cards. */
  readonly error?: string;
}

/**
 * Full Geology editor: a geography preset fills the editable area list. The
 * list is the configuration; it never promises a number of islands.
 */
export function GeologyForm({ error }: GeologyFormProps) {
  const areas = useGeologyFormStore(state => state.geology.areas);
  const preset = useGeologyFormStore(state => state.preset);
  const edited = useGeologyFormStore(state => state.edited);
  const addArea = useGeologyFormStore(state => state.addArea);
  const duplicateArea = useGeologyFormStore(state => state.duplicateArea);
  const removeArea = useGeologyFormStore(state => state.removeArea);
  const updateArea = useGeologyFormStore(state => state.updateArea);
  const applyPreset = useGeologyFormStore(state => state.applyPreset);
  const problems = new Set(error ? placementProblemAreaIds(error) : []);
  const atLimit = areas.length >= MAX_GEOLOGICAL_AREAS;

  return (
    <Flex direction='column' gap='4'>
      <Text size='1' color='gray'>
        A preset fills the area list; one area can grow zero, one or many islands, and several areas
        can share one island.
      </Text>
      <Flex direction='column' gap='2'>
        <Text size='2' weight='bold' color='gray'>
          Presets
        </Text>
        <RadioCards.Root
          columns='2'
          gap='2'
          size='1'
          value={preset ?? ''}
          onValueChange={value => applyPreset(value as GeographyPresetId)}
        >
          {PRESETS.map(item => (
            <RadioCards.Item key={item.id} value={item.id}>
              <Text size='2' weight='bold'>
                {item.label}
              </Text>
            </RadioCards.Item>
          ))}
        </RadioCards.Root>
        <Text size='1' color='gray'>
          {edited
            ? 'The list was edited by hand - choose a preset to start over.'
            : 'Choose a starting point, then adjust any area below.'}
        </Text>
      </Flex>
      {areas.map(area => (
        <Card key={area.id} variant='surface'>
          <AreaCard
            area={area}
            problem={problems.has(area.id)}
            canDuplicate={!atLimit}
            onChange={patch => updateArea(area.id, patch)}
            onDuplicate={() => duplicateArea(area.id)}
            onRemove={() => removeArea(area.id)}
          />
        </Card>
      ))}
      {areas.length === 0 ? (
        <Text size='2' color='gray'>
          No areas - the world stays ocean. Add one below to grow islands.
        </Text>
      ) : undefined}
      <Flex gap='2' wrap='wrap'>
        {ADD_PRESETS.map(item => (
          <Button
            key={item.id}
            size='1'
            variant='soft'
            disabled={atLimit}
            onClick={() => addArea(item.id)}
          >
            Add {item.label}
          </Button>
        ))}
      </Flex>
      <Text size='1' color='gray'>
        At most {MAX_GEOLOGICAL_AREAS} areas. Placement errors mark the offending entries after
        generation.
      </Text>
    </Flex>
  );
}
