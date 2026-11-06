import { Flex, RadioCards, Text } from '@radix-ui/themes';

import { useBaseClimateFormStore } from '../../../../../stores';
import { BASE_CLIMATE_PRESET_OPTIONS } from '../lib/preset-options';

export function PresetPicker() {
  const applyPreset = useBaseClimateFormStore(state => state.applyPreset);
  const activePreset = useBaseClimateFormStore(state => state.activePreset);
  const selected = BASE_CLIMATE_PRESET_OPTIONS.find(option => option.id === activePreset);

  return (
    <Flex direction='column' gap='2'>
      <Text size='2' weight='bold' color='gray'>
        Presets
      </Text>
      <RadioCards.Root
        columns='2'
        gap='2'
        size='1'
        aria-label='Base Climate preset'
        value={activePreset ?? ''}
        onValueChange={value => {
          const preset = BASE_CLIMATE_PRESET_OPTIONS.find(option => option.id === value);
          if (preset) {
            applyPreset(preset.id);
          }
        }}
      >
        {BASE_CLIMATE_PRESET_OPTIONS.map(preset => (
          <RadioCards.Item key={preset.id} value={preset.id}>
            <Text size='2' weight='bold'>
              {preset.label}
            </Text>
          </RadioCards.Item>
        ))}
      </RadioCards.Root>
      <Text size='1' color='gray'>
        {selected
          ? selected.description
          : 'Zones were edited manually — choose a preset to start over.'}
      </Text>
    </Flex>
  );
}
