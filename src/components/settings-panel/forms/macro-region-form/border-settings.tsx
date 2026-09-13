import { Flex, Text } from '@radix-ui/themes';

import { useMacroRegionFormStore } from '../../../../stores';
import { SliderField } from '../../../slider-field';

export const MAX_IRREGULARITY = 0.3;

export function irregularityLabel(value: number): string {
  if (value === 0) {
    return 'None';
  }
  if (value <= 0.1) {
    return 'Small';
  }
  if (value <= 0.2) {
    return 'Medium';
  }
  return 'Large';
}

export function BorderSettings() {
  const deformation = useMacroRegionFormStore(state => state.deformation);
  const setDeformation = useMacroRegionFormStore(state => state.setDeformation);

  return (
    <Flex direction='column' gap='2'>
      <Text size='2' weight='bold' color='gray'>
        Borders
      </Text>
      <SliderField
        label='Irregularity'
        description='How strongly region borders bend away from their geometric shape; overlays can override this.'
        value={deformation.amplitude}
        min={0}
        max={MAX_IRREGULARITY}
        step={0.01}
        format={irregularityLabel}
        rangeLabels={['None', 'Large']}
        onChange={amplitude => setDeformation({ ...deformation, amplitude })}
      />
    </Flex>
  );
}
