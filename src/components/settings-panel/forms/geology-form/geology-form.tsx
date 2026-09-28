import { Button, Flex, Text } from '@radix-ui/themes';

import { GEOLOGY_FORM_DEFAULTS, useGeologyFormStore } from '../../../../stores';
import {
  MAX_AREA_EXTENT,
  MAX_GEOLOGICAL_AREAS,
  MIN_AREA_EXTENT,
} from '../../../../utils/map-generator/stages/geology/defaults';
import type { GeologicalAreaPresetId } from '../../../../utils/map-generator/stages/geology/presets';
import { SliderField } from '../../../slider-field';

const ADD_PRESETS: readonly { id: GeologicalAreaPresetId; label: string }[] = [
  { id: 'shallow-archipelago', label: 'Shallow' },
  { id: 'volcanic', label: 'Volcanic' },
  { id: 'atoll', label: 'Atoll' },
];

/**
 * Minimal Geology editor for the cutover: the area list with one size
 * control per entry. Full editing and presets arrive in GEO-06B; the form
 * never draws geometry, it only owns the `GeologyConfig` value.
 */
export function GeologyForm() {
  const areas = useGeologyFormStore(state => state.geology.areas);
  const addArea = useGeologyFormStore(state => state.addArea);
  const removeArea = useGeologyFormStore(state => state.removeArea);
  const setAreaExtent = useGeologyFormStore(state => state.setAreaExtent);
  const atLimit = areas.length >= MAX_GEOLOGICAL_AREAS;

  return (
    <Flex direction='column' gap='4'>
      <Text size='1' color='gray'>
        One area can grow zero, one or many islands; several areas can share one island.
      </Text>
      {areas.map(area => (
        <Flex key={area.id} direction='column' gap='2'>
          <Flex justify='between' align='center'>
            <Text size='2' weight='bold'>
              {area.id} ({area.relief})
            </Text>
            <Button
              size='1'
              variant='soft'
              onClick={() => removeArea(area.id)}
              aria-label={`Remove ${area.id}`}
            >
              Remove
            </Button>
          </Flex>
          <SliderField
            label={`Extent of ${area.id}`}
            description='Influence radius as a share of the world; the field fades out before its edge.'
            value={area.extent}
            min={MIN_AREA_EXTENT}
            max={MAX_AREA_EXTENT}
            step={0.01}
            format={value => `${Math.round(value * 100)}%`}
            onChange={value => setAreaExtent(area.id, value)}
          />
        </Flex>
      ))}
      {areas.length === 0 ? (
        <Text size='2' color='gray'>
          No areas - the world stays ocean. Add one below to grow islands.
        </Text>
      ) : undefined}
      <Flex gap='2' wrap='wrap'>
        {ADD_PRESETS.map(preset => (
          <Button
            key={preset.id}
            size='1'
            variant='soft'
            disabled={atLimit}
            onClick={() => addArea(preset.id)}
          >
            Add {preset.label}
          </Button>
        ))}
      </Flex>
      <Text size='1' color='gray'>
        {GEOLOGY_FORM_DEFAULTS.geology.areas.length} area by default. Full editing and the plan
        preview arrive later; placement errors name the offending entry after generation.
      </Text>
    </Flex>
  );
}
