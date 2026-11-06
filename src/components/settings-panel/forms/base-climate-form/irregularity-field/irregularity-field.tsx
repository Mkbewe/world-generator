import { Flex, Text } from '@radix-ui/themes';

import { useBaseClimateFormStore } from '../../../../../stores';
import { MAX_HEAT_ZONE_IRREGULARITY } from '../../../../../utils/map-generator/stages/base-climate/defaults';
import { SliderField } from '../../../../slider-field';
import { irregularityLabel } from '../../lib/irregularity';

export function IrregularityField() {
  const irregularity = useBaseClimateFormStore(state => state.irregularity);
  const setIrregularity = useBaseClimateFormStore(state => state.setIrregularity);

  return (
    <Flex direction='column' gap='2'>
      <Text size='2' weight='bold' color='gray'>
        Boundaries
      </Text>
      <SliderField
        label='Irregularity'
        description='How strongly heat-zone borders bend away from their geometric shape.'
        value={irregularity}
        min={0}
        max={MAX_HEAT_ZONE_IRREGULARITY}
        step={0.01}
        format={irregularityLabel}
        rangeLabels={['None', 'Large']}
        onChange={setIrregularity}
      />
    </Flex>
  );
}
