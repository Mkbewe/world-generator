import { useTranslation } from 'react-i18next';
import { Flex, SegmentedControl, Text } from '@radix-ui/themes';

import { SegmentedControlScroll } from '../../../../segmented-control-scroll';
import type { WorldShape } from '../lib/world-shape';

interface ShapeFieldProps {
  shape: WorldShape;
  onShapeChange: (shape: WorldShape) => void;
}

export function ShapeField({ shape, onShapeChange }: ShapeFieldProps) {
  const { t } = useTranslation();

  return (
    <Flex direction='column' gap='2'>
      <Text size='2' color='gray'>
        {t('forms.worldShape.shape')}
      </Text>
      <SegmentedControlScroll>
        <SegmentedControl.Root
          value={shape}
          size='2'
          aria-label={t('forms.worldShape.shapeAria')}
          onValueChange={value => onShapeChange(value as WorldShape)}
        >
          <SegmentedControl.Item value='disc'>{t('forms.worldShape.disc')}</SegmentedControl.Item>
          <SegmentedControl.Item value='rectangle'>
            {t('forms.worldShape.rectangle')}
          </SegmentedControl.Item>
        </SegmentedControl.Root>
      </SegmentedControlScroll>
    </Flex>
  );
}
