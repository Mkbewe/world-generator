import { useTranslation } from 'react-i18next';
import type { MacroRegionLayout } from '@generator/stages/macro-region/editor/presets';
import { Flex, SegmentedControl, Text } from '@radix-ui/themes';

import { useMacroRegionFormStore } from '../../../../../stores';
import { SegmentedControlScroll } from '../../../../segmented-control-scroll';

export function BaseLayoutField() {
  const { t } = useTranslation();
  const layout = useMacroRegionFormStore(state => state.layout);
  const applyLayout = useMacroRegionFormStore(state => state.applyLayout);

  return (
    <Flex direction='column' gap='2'>
      <Text size='2' weight='bold' color='gray'>
        {t('forms.macroRegion.baseLayout')}
      </Text>
      <SegmentedControlScroll>
        <SegmentedControl.Root
          value={layout}
          onValueChange={value => applyLayout(value as MacroRegionLayout)}
        >
          <SegmentedControl.Item value='radial'>
            {t('forms.macroRegion.layoutRadial')}
          </SegmentedControl.Item>
          <SegmentedControl.Item value='horizontal'>
            {t('forms.macroRegion.layoutHorizontal')}
          </SegmentedControl.Item>
          <SegmentedControl.Item value='vertical'>
            {t('forms.macroRegion.layoutVertical')}
          </SegmentedControl.Item>
        </SegmentedControl.Root>
      </SegmentedControlScroll>
      <Text size='1' color='gray'>
        {t('forms.macroRegion.baseLayoutHint')}
      </Text>
    </Flex>
  );
}
