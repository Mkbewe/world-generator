import { Flex, RadioCards, Text } from '@radix-ui/themes';

import { useMacroRegionFormStore } from '../../../../../stores';
import {
  MACRO_REGION_PRESETS,
  type MacroRegionPresetId,
} from '../../../../../utils/map-generator/stages/macro-region/presets';

export function PresetPicker() {
  const applyPreset = useMacroRegionFormStore(state => state.applyPreset);
  const activePreset = useMacroRegionFormStore(state => state.activePreset);

  return (
    <Flex direction='column' gap='2'>
      <Text size='2' weight='bold' color='gray'>
        Presets
      </Text>
      <RadioCards.Root
        columns='2'
        gap='2'
        size='1'
        value={activePreset ?? ''}
        onValueChange={value => applyPreset(value as MacroRegionPresetId)}
      >
        {MACRO_REGION_PRESETS.map(preset => (
          <RadioCards.Item key={preset.id} value={preset.id}>
            <Text size='2' weight='bold'>
              {preset.label}
            </Text>
          </RadioCards.Item>
        ))}
      </RadioCards.Root>
      <Text size='1' color='gray'>
        {activePreset
          ? 'Choose a starting point, then adjust any region below.'
          : 'Regions were edited manually — choose a preset to start over.'}
      </Text>
    </Flex>
  );
}
