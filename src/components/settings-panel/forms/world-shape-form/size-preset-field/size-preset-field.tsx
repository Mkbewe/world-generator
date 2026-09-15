import { Flex, SegmentedControl, Text } from '@radix-ui/themes';

import { SegmentedControlScroll } from '../../../../segmented-control-scroll';
import { SIZE_PRESETS } from '../lib/size-presets';
import type { WorldSize } from '../lib/world-shape';

interface SizePresetFieldProps {
  sizeMeters: WorldSize;
  onSelect: (sizeMeters: WorldSize) => void;
}

export function SizePresetField({ sizeMeters, onSelect }: SizePresetFieldProps) {
  const activePreset = SIZE_PRESETS.find(preset => preset.sizeMeters === sizeMeters)?.value;

  return (
    <Flex direction='column' gap='2'>
      <Text size='2' color='gray'>
        Size preset:
      </Text>
      <SegmentedControlScroll>
        <SegmentedControl.Root
          value={activePreset}
          size='2'
          onValueChange={value => {
            const preset = SIZE_PRESETS.find(item => item.value === value);
            if (preset) {
              onSelect(preset.sizeMeters);
            }
          }}
        >
          {SIZE_PRESETS.map(preset => (
            <SegmentedControl.Item key={preset.value} value={preset.value}>
              {preset.label}
            </SegmentedControl.Item>
          ))}
        </SegmentedControl.Root>
      </SegmentedControlScroll>
    </Flex>
  );
}
