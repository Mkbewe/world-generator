import { useTranslation } from 'react-i18next';
import { Flex, Text } from '@radix-ui/themes';

import { useMacroRegionFormStore } from '../../../../../stores';
import { SliderField } from '../../../../slider-field';
import { irregularityKey, MAX_IRREGULARITY } from '../../lib/irregularity';

export function BorderSettings() {
  const { t } = useTranslation();
  const deformation = useMacroRegionFormStore(state => state.deformation);
  const setDeformation = useMacroRegionFormStore(state => state.setDeformation);

  return (
    <Flex direction='column' gap='2'>
      <Text size='2' weight='bold' color='gray'>
        {t('forms.macroRegion.borders')}
      </Text>
      <SliderField
        label={t('forms.macroRegion.irregularity')}
        description={t('forms.macroRegion.irregularityDescription')}
        value={deformation.amplitude}
        min={0}
        max={MAX_IRREGULARITY}
        step={0.01}
        format={value => t(irregularityKey(value))}
        rangeLabels={[t('forms.irregularity.none'), t('forms.irregularity.large')]}
        onChange={amplitude => setDeformation({ ...deformation, amplitude })}
      />
    </Flex>
  );
}
