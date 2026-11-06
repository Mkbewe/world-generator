import { Flex, SegmentedControl, Text } from '@radix-ui/themes';

import { useBaseClimateFormStore } from '../../../../../stores';
import { SegmentedControlScroll } from '../../../../segmented-control-scroll';
import { HEAT_ZONE_LAYOUT_OPTIONS } from '../lib/layout-options';

export function LayoutField() {
  const layout = useBaseClimateFormStore(state => state.layout);
  const applyLayout = useBaseClimateFormStore(state => state.applyLayout);

  return (
    <Flex direction='column' gap='2'>
      <Text size='2' weight='bold' color='gray'>
        Layout
      </Text>
      <SegmentedControlScroll>
        <SegmentedControl.Root
          value={layout}
          aria-label='Heat zone layout'
          onValueChange={value => {
            const option = HEAT_ZONE_LAYOUT_OPTIONS.find(item => item.id === value);
            if (option) {
              applyLayout(option.id);
            }
          }}
        >
          {HEAT_ZONE_LAYOUT_OPTIONS.map(option => (
            <SegmentedControl.Item key={option.id} value={option.id}>
              {option.label}
            </SegmentedControl.Item>
          ))}
        </SegmentedControl.Root>
      </SegmentedControlScroll>
      <Text size='1' color='gray'>
        Bands cover one axis; rings cover the radius. Switching the layout converts the zones and
        keeps their labels, classes and shares.
      </Text>
    </Flex>
  );
}
