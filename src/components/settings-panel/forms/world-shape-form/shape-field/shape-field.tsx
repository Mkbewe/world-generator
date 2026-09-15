import { Flex, SegmentedControl, Text } from '@radix-ui/themes';

import { SegmentedControlScroll } from '../../../../segmented-control-scroll';
import type { WorldShape } from '../lib/world-shape';

interface ShapeFieldProps {
  shape: WorldShape;
  onShapeChange: (shape: WorldShape) => void;
}

export function ShapeField({ shape, onShapeChange }: ShapeFieldProps) {
  return (
    <Flex direction='column' gap='2'>
      <Text size='2' color='gray'>
        Shape:
      </Text>
      <SegmentedControlScroll>
        <SegmentedControl.Root
          value={shape}
          size='2'
          aria-label='World shape'
          onValueChange={value => onShapeChange(value as WorldShape)}
        >
          <SegmentedControl.Item value='disc'>Disc</SegmentedControl.Item>
          <SegmentedControl.Item value='rectangle'>Rectangle</SegmentedControl.Item>
        </SegmentedControl.Root>
      </SegmentedControlScroll>
    </Flex>
  );
}
