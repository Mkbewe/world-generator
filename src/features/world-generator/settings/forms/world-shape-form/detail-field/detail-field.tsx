import { useTranslation } from 'react-i18next';
import { Flex, SegmentedControl, Text } from '@radix-ui/themes';

import { SegmentedControlScroll } from '../../../../../../components/segmented-control-scroll';
import { TERRAIN_DETAIL_OPTIONS } from '../lib/terrain-detail';

interface DetailFieldProps {
  metersPerSample: number;
  onChange: (metersPerSample: number) => void;
}

export function DetailField({ metersPerSample, onChange }: DetailFieldProps) {
  const { t } = useTranslation();
  const active = TERRAIN_DETAIL_OPTIONS.find(
    option => option.metersPerSample === metersPerSample
  )?.value;

  return (
    <Flex direction='column' gap='2'>
      <Text size='2' color='gray'>
        {t('forms.worldShape.terrainDetail')}
      </Text>
      <SegmentedControlScroll>
        <SegmentedControl.Root
          value={active}
          size='1'
          aria-label={t('forms.worldShape.terrainDetailAria')}
          onValueChange={value => {
            const option = TERRAIN_DETAIL_OPTIONS.find(item => item.value === value);
            if (option) {
              onChange(option.metersPerSample);
            }
          }}
        >
          {TERRAIN_DETAIL_OPTIONS.map(option => (
            <SegmentedControl.Item key={option.value} value={option.value}>
              {t(option.labelKey)}
            </SegmentedControl.Item>
          ))}
        </SegmentedControl.Root>
      </SegmentedControlScroll>
      <Text size='1' color='gray'>
        {t('forms.worldShape.terrainDetailHint')}
      </Text>
    </Flex>
  );
}
