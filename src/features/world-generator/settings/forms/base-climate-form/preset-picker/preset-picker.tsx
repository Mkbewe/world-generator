import { useTranslation } from 'react-i18next';
import { Flex, RadioCards, Text } from '@radix-ui/themes';

import { useBaseClimateFormStore } from '../../../../../../stores';
import { BASE_CLIMATE_PRESET_OPTIONS } from '../lib/preset-options';

export function PresetPicker() {
  const { t } = useTranslation();
  const applyPreset = useBaseClimateFormStore(state => state.applyPreset);
  const activePreset = useBaseClimateFormStore(state => state.activePreset);
  const selected = BASE_CLIMATE_PRESET_OPTIONS.find(option => option.id === activePreset);

  return (
    <Flex direction='column' gap='2'>
      <Text size='2' weight='bold' color='gray'>
        {t('forms.baseClimate.presets')}
      </Text>
      <RadioCards.Root
        columns='2'
        gap='2'
        size='1'
        aria-label={t('forms.baseClimate.presetAria')}
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
              {t(preset.labelKey)}
            </Text>
          </RadioCards.Item>
        ))}
      </RadioCards.Root>
      <Text size='1' color='gray'>
        {selected ? t(selected.descriptionKey) : t('forms.baseClimate.presetEditedHint')}
      </Text>
    </Flex>
  );
}
