import { useTranslation } from 'react-i18next';
import { Flex, Text } from '@radix-ui/themes';

import { SliderField } from '../../../../../../components/slider-field';
import { useBaseClimateFormStore } from '../../../../../../stores';

export function MoistureField() {
  const { t } = useTranslation();
  const moisture = useBaseClimateFormStore(state => state.moisture);
  const setMoisture = useBaseClimateFormStore(state => state.setMoisture);

  return (
    <Flex direction='column' gap='2'>
      <Text size='2' weight='bold' color='gray'>
        {t('forms.baseClimate.moisture')}
      </Text>
      <SliderField
        label={t('forms.baseClimate.moistureLabel')}
        description={t('forms.baseClimate.moistureDescription')}
        value={moisture}
        min={0}
        max={1}
        step={0.05}
        format={value => t(moistureKey(value), { percent: Math.round(value * 100) })}
        rangeLabels={[t('forms.baseClimate.dry'), t('forms.baseClimate.wet')]}
        onChange={setMoisture}
      />
    </Flex>
  );
}

function moistureKey(value: number) {
  if (value <= 0.2) {
    return 'forms.baseClimate.moistureDry' as const;
  }
  if (value < 0.45) {
    return 'forms.baseClimate.moistureSlightlyDry' as const;
  }
  if (value <= 0.55) {
    return 'forms.baseClimate.moistureBalanced' as const;
  }
  if (value < 0.8) {
    return 'forms.baseClimate.moistureSlightlyWet' as const;
  }
  return 'forms.baseClimate.moistureWet' as const;
}
