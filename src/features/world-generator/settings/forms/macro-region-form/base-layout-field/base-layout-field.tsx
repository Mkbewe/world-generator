import { useTranslation } from 'react-i18next';
import type { MacroRegionLayout } from '@generator/stages/macro-region/editor/presets';
import { Flex, SegmentedControl, Text } from '@radix-ui/themes';

import { isOneOf } from '../../../../../../components/lib/option-value';
import { SegmentedControlScroll } from '../../../../../../components/segmented-control-scroll';
import { useMacroRegionFormStore } from '../../../../../../stores';

const MACRO_REGION_LAYOUTS = [
  'radial',
  'horizontal',
  'vertical',
] as const satisfies readonly MacroRegionLayout[];

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
          onValueChange={value => {
            if (isOneOf(value, MACRO_REGION_LAYOUTS)) {
              applyLayout(value);
            }
          }}
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
