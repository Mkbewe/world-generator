import { useEffect } from 'react';
import { Button, Card, Flex, RadioCards, Text } from '@radix-ui/themes';

import { AreaCard } from './area-card';
import {
  useGeneralFormStore,
  useGeologyFormStore,
  useWorldShapeFormStore,
} from '../../../../stores';
import type { StageFailure } from '../../../../utils/map-generator';
import {
  createGeographyPreset,
  GEOGRAPHY_PRESET_IDS,
  type GeographyPresetId,
  type GeologicalAreaPresetId,
  isGeographyPresetId,
  MAX_GEOLOGICAL_AREAS,
} from '../../../../utils/map-generator/stages/geology';
import { dimensionsFromMeters } from '../../../../utils/world-dimensions';

const PRESET_LABELS: Record<GeographyPresetId, string> = {
  random: 'Random',
  archipelago: 'Archipelago',
  'volcanic-islands': 'Volcanic islands',
  'lagoons-atolls': 'Lagoons and atolls',
};

const PRESETS: readonly { readonly id: GeographyPresetId; readonly label: string }[] =
  GEOGRAPHY_PRESET_IDS.map(id => ({ id, label: PRESET_LABELS[id] }));

const ADD_PRESETS: readonly { readonly id: GeologicalAreaPresetId; readonly label: string }[] = [
  { id: 'shallow-archipelago', label: 'Ordinary' },
  { id: 'volcanic', label: 'Volcanic' },
  { id: 'atoll', label: 'Atoll' },
];

interface GeologyFormProps {
  /** Entry-level failures of the last run; their cards get marked. */
  readonly failures?: readonly StageFailure[];
}

/**
 * Full Geology editor: a geography preset fills the editable area list. The
 * list is the configuration; it never promises a number of islands.
 */
export function GeologyForm({ failures }: GeologyFormProps) {
  const areas = useGeologyFormStore(state => state.geology.areas);
  const preset = useGeologyFormStore(state => state.preset);
  const edited = useGeologyFormStore(state => state.edited);
  const addArea = useGeologyFormStore(state => state.addArea);
  const duplicateArea = useGeologyFormStore(state => state.duplicateArea);
  const removeArea = useGeologyFormStore(state => state.removeArea);
  const updateArea = useGeologyFormStore(state => state.updateArea);
  const applyPreset = useGeologyFormStore(state => state.applyPreset);
  const refreshPreset = useGeologyFormStore(state => state.refreshPreset);
  const seed = useGeneralFormStore(state => state.seed);
  const shape = useWorldShapeFormStore(state => state.shape);
  const sizeMeters = useWorldShapeFormStore(state => state.sizeMeters);
  const problems = new Map((failures ?? []).map(failure => [failure.id, failure.message] as const));
  const atLimit = areas.length >= MAX_GEOLOGICAL_AREAS;
  const numericSeed = Number(seed);

  useEffect(() => {
    if (preset && !edited && seed.trim() !== '' && Number.isSafeInteger(numericSeed)) {
      refreshPreset(
        createGeographyPreset(preset, numericSeed, presetDimensions(sizeMeters), shape)
      );
    }
  }, [preset, edited, numericSeed, sizeMeters, shape, refreshPreset, seed]);

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
          onValueChange={value => {
            if (isGeographyPresetId(value) && Number.isSafeInteger(numericSeed)) {
              applyPreset(
                value,
                createGeographyPreset(value, numericSeed, presetDimensions(sizeMeters), shape)
              );
            }
          }}
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
      <Flex direction='column' gap='2'>
        <Text size='2' weight='bold' color='gray'>
          Add area
        </Text>
        <Flex gap='2' wrap='wrap'>
          {ADD_PRESETS.map(item => (
            <Button
              key={item.id}
              size='1'
              variant='soft'
              disabled={atLimit}
              onClick={() => addArea(item.id)}
            >
              {item.label}
            </Button>
          ))}
        </Flex>
      </Flex>
      {areas.map(area => (
        <Card key={area.id} variant='surface'>
          <AreaCard
            area={area}
            problem={problems.get(area.id)}
            canDuplicate={!atLimit}
            onChange={patch => updateArea(area.id, patch)}
            onDuplicate={() => duplicateArea(area.id)}
            onRemove={() => removeArea(area.id)}
          />
        </Card>
      ))}
      {areas.length === 0 ? (
        <Text size='2' color='gray'>
          No areas - the world stays ocean. Add one above to grow islands.
        </Text>
      ) : undefined}
      <Text size='1' color='gray'>
        At most {MAX_GEOLOGICAL_AREAS} areas. Placement errors mark the offending entries after
        generation.
      </Text>
    </Flex>
  );
}

function presetDimensions(sizeMeters: number) {
  return dimensionsFromMeters({
    widthMeters: sizeMeters,
    heightMeters: sizeMeters,
    metersPerSample: 1,
  });
}
