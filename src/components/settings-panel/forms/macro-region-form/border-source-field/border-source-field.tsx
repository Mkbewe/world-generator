import { Flex, SegmentedControl, Text } from '@radix-ui/themes';

import { useMacroRegionFormStore } from '../../../../../stores';
import type { MacroRegionNoiseSource } from '../../../../../utils/map-generator';
import { DEFAULT_REGION_NOISE_SOURCE } from '../../../../../utils/map-generator/stages/macro-region-defaults';
import { SegmentedControlScroll } from '../../../../segmented-control-scroll';

export function BorderSourceField() {
  const deformation = useMacroRegionFormStore(state => state.deformation);
  const setDeformation = useMacroRegionFormStore(state => state.setDeformation);
  const source = deformation.source ?? DEFAULT_REGION_NOISE_SOURCE;

  return (
    <Flex direction='column' gap='2'>
      <Text size='2' weight='bold' color='gray'>
        Border noise
      </Text>
      <SegmentedControlScroll>
        <SegmentedControl.Root
          value={source}
          onValueChange={value =>
            setDeformation({ ...deformation, source: value as MacroRegionNoiseSource })
          }
        >
          <SegmentedControl.Item value='dedicated'>Dedicated</SegmentedControl.Item>
          <SegmentedControl.Item value='noise-map'>Noise layer</SegmentedControl.Item>
        </SegmentedControl.Root>
      </SegmentedControlScroll>
      <Text size='1' color='gray'>
        {source === 'noise-map'
          ? 'Borders follow the Noise settings, so changing them reshapes the regions.'
          : 'Borders use their own deterministic noise, independent of the Noise settings.'}
      </Text>
    </Flex>
  );
}
