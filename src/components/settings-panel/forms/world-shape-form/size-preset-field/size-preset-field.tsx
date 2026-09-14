import { Flex, SegmentedControl, Text } from '@radix-ui/themes';

import { SIZE_PRESETS } from '../lib/size-presets';
import type { WorldSize } from '../lib/world-shape';

interface SizePresetFieldProps {
  size: WorldSize;
  onSelect: (size: WorldSize) => void;
}

export function SizePresetField({ size, onSelect }: SizePresetFieldProps) {
  const activePreset = SIZE_PRESETS.find(preset => preset.size === size)?.value;

  return (
    <Flex direction='column' gap='2'>
      <Text size='2' color='gray'>
        Size preset:
      </Text>
      <SegmentedControl.Root
        value={activePreset}
        size='2'
        onValueChange={value => {
          const preset = SIZE_PRESETS.find(item => item.value === value);
          if (preset) {
            onSelect(preset.size);
          }
        }}
      >
        {SIZE_PRESETS.map(preset => (
          <SegmentedControl.Item key={preset.value} value={preset.value}>
            {preset.label}
          </SegmentedControl.Item>
        ))}
      </SegmentedControl.Root>
      {activePreset && (
        <Text size='1' color='gray'>
          {size} × {size} px
        </Text>
      )}
    </Flex>
  );
}
