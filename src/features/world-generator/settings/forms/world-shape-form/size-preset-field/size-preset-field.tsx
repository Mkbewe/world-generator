import { useTranslation } from 'react-i18next';
import { Flex, SegmentedControl, Text } from '@radix-ui/themes';

import { SegmentedControlScroll } from '../../../../../../components/segmented-control-scroll';
import { SIZE_PRESETS } from '../lib/size-presets';
import type { WorldSize } from '../lib/world-shape';

interface SizePresetFieldProps {
  sizeMeters: WorldSize;
  onSelect: (sizeMeters: WorldSize) => void;
}

export function SizePresetField({ sizeMeters, onSelect }: SizePresetFieldProps) {
  const { t } = useTranslation();
  const activePreset = SIZE_PRESETS.find(preset => preset.sizeMeters === sizeMeters)?.value;

  return (
    <Flex direction='column' gap='2'>
      <Text size='2' color='gray'>
        {t('forms.worldShape.sizePreset')}
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
              {t(preset.labelKey)}
            </SegmentedControl.Item>
          ))}
        </SegmentedControl.Root>
      </SegmentedControlScroll>
    </Flex>
  );
}
