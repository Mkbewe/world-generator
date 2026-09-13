import { Box, Flex, Slider, Text } from '@radix-ui/themes';

import { InfoLabel } from '../info-label';
import styles from './slider-field.module.scss';

interface SliderFieldProps {
  label: string;
  description: string;
  value: number;
  min: number;
  max: number;
  step: number;
  swatch?: string;
  format?: (value: number) => string;
  rangeLabels?: readonly [minimum: string, maximum: string];
  onChange: (value: number) => void;
}

export function SliderField({
  label,
  description,
  value,
  min,
  max,
  step,
  swatch,
  format = current => current.toFixed(2),
  rangeLabels,
  onChange,
}: SliderFieldProps) {
  return (
    <Flex direction='column' gap='1'>
      <Flex justify='between' align='center'>
        <InfoLabel label={label} description={description} />
        <Flex align='center' gap='2'>
          {swatch && (
            <Box className={styles.sliderSwatch} style={{ backgroundColor: swatch }} aria-hidden />
          )}
          <Text size='1' weight='bold'>
            {format(value)}
          </Text>
        </Flex>
      </Flex>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={step}
        aria-label={label}
        onValueChange={([next]) => onChange(next)}
      />
      {rangeLabels && (
        <Flex justify='between'>
          <Text size='1' color='gray'>
            {rangeLabels[0]}
          </Text>
          <Text size='1' color='gray'>
            {rangeLabels[1]}
          </Text>
        </Flex>
      )}
    </Flex>
  );
}
