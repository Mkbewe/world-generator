import { Flex, SegmentedControl, Text } from '@radix-ui/themes';

import { SegmentedControlScroll } from '../../../../segmented-control-scroll';
import { TERRAIN_DETAIL_OPTIONS } from '../lib/terrain-detail';

interface DetailFieldProps {
  metersPerSample: number;
  onChange: (metersPerSample: number) => void;
}

export function DetailField({ metersPerSample, onChange }: DetailFieldProps) {
  const active = TERRAIN_DETAIL_OPTIONS.find(
    option => option.metersPerSample === metersPerSample
  )?.value;

  return (
    <Flex direction='column' gap='2'>
      <Text size='2' color='gray'>
        Terrain detail:
      </Text>
      <SegmentedControlScroll>
        <SegmentedControl.Root
          value={active}
          size='2'
          aria-label='Terrain detail'
          onValueChange={value => {
            const option = TERRAIN_DETAIL_OPTIONS.find(item => item.value === value);
            if (option) {
              onChange(option.metersPerSample);
            }
          }}
        >
          {TERRAIN_DETAIL_OPTIONS.map(option => (
            <SegmentedControl.Item key={option.value} value={option.value}>
              {option.label}
            </SegmentedControl.Item>
          ))}
        </SegmentedControl.Root>
      </SegmentedControlScroll>
      <Text size='1' color='gray'>
        Smaller values keep more terrain detail in every sample.
      </Text>
    </Flex>
  );
}
