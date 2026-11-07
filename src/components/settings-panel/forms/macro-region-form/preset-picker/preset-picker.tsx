import { useTranslation } from 'react-i18next';
import { Flex, RadioCards, Text } from '@radix-ui/themes';

import { useMacroRegionFormStore } from '../../../../../stores';
import { MACRO_REGION_PRESETS, type MacroRegionPresetId } from '../lib/presets';

export function PresetPicker() {
  const { t } = useTranslation();
  const applyPreset = useMacroRegionFormStore(state => state.applyPreset);
  const activePreset = useMacroRegionFormStore(state => state.activePreset);

  return (
    <Flex direction='column' gap='2'>
      <Text size='2' weight='bold' color='gray'>
        {t('forms.macroRegion.presets')}
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
              {t(preset.labelKey)}
            </Text>
          </RadioCards.Item>
        ))}
      </RadioCards.Root>
      <Text size='1' color='gray'>
        {t(activePreset ? 'forms.macroRegion.presetHint' : 'forms.macroRegion.presetEditedHint')}
      </Text>
    </Flex>
  );
}
