import { Flex, SegmentedControl, Text } from '@radix-ui/themes';

import { useMacroRegionFormStore } from '../../../../../stores';
import type { MacroRegionLayout } from '../../../../../utils/map-generator/stages/macro-region/editor/presets';
import { SegmentedControlScroll } from '../../../../segmented-control-scroll';

export function BaseLayoutField() {
  const layout = useMacroRegionFormStore(state => state.layout);
  const applyLayout = useMacroRegionFormStore(state => state.applyLayout);

  return (
    <Flex direction='column' gap='2'>
      <Text size='2' weight='bold' color='gray'>
        Base layout
      </Text>
      <SegmentedControlScroll>
        <SegmentedControl.Root
          value={layout}
          onValueChange={value => applyLayout(value as MacroRegionLayout)}
        >
          <SegmentedControl.Item value='radial'>Radial</SegmentedControl.Item>
          <SegmentedControl.Item value='horizontal'>Horizontal</SegmentedControl.Item>
          <SegmentedControl.Item value='vertical'>Vertical</SegmentedControl.Item>
        </SegmentedControl.Root>
      </SegmentedControlScroll>
      <Text size='1' color='gray'>
        Base regions cover the world without overlapping.
      </Text>
    </Flex>
  );
}
