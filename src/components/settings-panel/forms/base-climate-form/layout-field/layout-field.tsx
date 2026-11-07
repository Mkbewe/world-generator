import { useTranslation } from 'react-i18next';
import { Flex, SegmentedControl, Text } from '@radix-ui/themes';

import { useBaseClimateFormStore } from '../../../../../stores';
import { SegmentedControlScroll } from '../../../../segmented-control-scroll';
import { HEAT_ZONE_LAYOUT_OPTIONS } from '../lib/layout-options';

export function LayoutField() {
  const { t } = useTranslation();
  const layout = useBaseClimateFormStore(state => state.layout);
  const applyLayout = useBaseClimateFormStore(state => state.applyLayout);

  return (
    <Flex direction='column' gap='2'>
      <Text size='2' weight='bold' color='gray'>
        {t('forms.baseClimate.layout')}
      </Text>
      <SegmentedControlScroll>
        <SegmentedControl.Root
          value={layout}
          aria-label={t('forms.baseClimate.layoutAria')}
          onValueChange={value => {
            const option = HEAT_ZONE_LAYOUT_OPTIONS.find(item => item.id === value);
            if (option) {
              applyLayout(option.id);
            }
          }}
        >
          {HEAT_ZONE_LAYOUT_OPTIONS.map(option => (
            <SegmentedControl.Item key={option.id} value={option.id}>
              {t(option.labelKey)}
            </SegmentedControl.Item>
          ))}
        </SegmentedControl.Root>
      </SegmentedControlScroll>
      <Text size='1' color='gray'>
        {t('forms.baseClimate.layoutHint')}
      </Text>
    </Flex>
  );
}
