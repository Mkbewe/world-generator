import { useTranslation } from 'react-i18next';
import { MAX_HEAT_ZONE_IRREGULARITY } from '@generator/stages/base-climate/defaults';
import { Flex, Text } from '@radix-ui/themes';

import { useBaseClimateFormStore } from '../../../../../stores';
import { SliderField } from '../../../../slider-field';
import { irregularityKey } from '../../lib/irregularity';

export function IrregularityField() {
  const { t } = useTranslation();
  const irregularity = useBaseClimateFormStore(state => state.irregularity);
  const setIrregularity = useBaseClimateFormStore(state => state.setIrregularity);

  return (
    <Flex direction='column' gap='2'>
      <Text size='2' weight='bold' color='gray'>
        {t('forms.baseClimate.boundaries')}
      </Text>
      <SliderField
        label={t('forms.baseClimate.irregularity')}
        description={t('forms.baseClimate.irregularityDescription')}
        value={irregularity}
        min={0}
        max={MAX_HEAT_ZONE_IRREGULARITY}
        step={0.01}
        format={value => t(irregularityKey(value))}
        rangeLabels={[t('forms.irregularity.none'), t('forms.irregularity.large')]}
        onChange={setIrregularity}
      />
    </Flex>
  );
}
