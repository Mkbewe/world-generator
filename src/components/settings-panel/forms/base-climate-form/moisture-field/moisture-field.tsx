import { Flex, Text } from '@radix-ui/themes';

import { useBaseClimateFormStore } from '../../../../../stores';
import { SliderField } from '../../../../slider-field';

export function MoistureField() {
  const moisture = useBaseClimateFormStore(state => state.moisture);
  const setMoisture = useBaseClimateFormStore(state => state.setMoisture);

  return (
    <Flex direction='column' gap='2'>
      <Text size='2' weight='bold' color='gray'>
        Moisture
      </Text>
      <SliderField
        label='World moisture'
        description='Shifts the base moisture field towards dry or wet. The seed still shapes the local variation.'
        value={moisture}
        min={0}
        max={1}
        step={0.05}
        format={moistureLabel}
        rangeLabels={['Dry', 'Wet']}
        onChange={setMoisture}
      />
    </Flex>
  );
}

function moistureLabel(value: number): string {
  const percent = Math.round(value * 100);
  if (value <= 0.2) {
    return `Dry · ${percent}%`;
  }
  if (value < 0.45) {
    return `Slightly dry · ${percent}%`;
  }
  if (value <= 0.55) {
    return `Balanced · ${percent}%`;
  }
  if (value < 0.8) {
    return `Slightly wet · ${percent}%`;
  }
  return `Wet · ${percent}%`;
}
