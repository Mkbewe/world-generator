import { Flex, Text } from '@radix-ui/themes';

import { DistributionBar } from './distribution-bar';
import { useMacroRegionFormStore } from '../../../../../stores';
import {
  regionBoundaries,
  regionSegments,
} from '../../../../../utils/map-generator/stages/macro-region-sizes';
import type { MacroRegionConfig } from '../../../../../utils/map-generator/types';

export function RegionDistribution({ regions }: { regions: readonly MacroRegionConfig[] }) {
  const layout = useMacroRegionFormStore(state => state.layout);
  const setRegionBoundaries = useMacroRegionFormStore(state => state.setRegionBoundaries);
  const segments = regionSegments(layout, regions);
  const boundaries = regionBoundaries(layout, regions);

  const moveBoundary = (index: number, percent: number): void => {
    const next = [...boundaries];
    next[index] = Math.round(percent);
    setRegionBoundaries(next);
  };

  return (
    <Flex direction='column' gap='2'>
      <div role='group' aria-label='Region boundaries'>
        <DistributionBar segments={segments} boundaries={boundaries} onMove={moveBoundary} />
      </div>
      <Text size='1' color='gray'>
        Drag a boundary on the bar to resize the two neighbouring regions.
      </Text>
    </Flex>
  );
}
