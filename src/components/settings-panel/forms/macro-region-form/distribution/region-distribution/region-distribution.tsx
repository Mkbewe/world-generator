import { Flex, Text } from '@radix-ui/themes';

import type { MacroRegionSegment } from '../../../../../../utils/map-generator/stages/macro-region/boundary-model';
import type { BoundaryDraft } from '../../hooks/use-boundary-draft';
import { DistributionBar } from '../distribution-bar';

interface RegionDistributionProps {
  segments: readonly MacroRegionSegment[];
  draft: BoundaryDraft;
}

export function RegionDistribution({ segments, draft }: RegionDistributionProps) {
  return (
    <Flex direction='column' gap='2'>
      <div role='group' aria-label='Region boundaries'>
        <DistributionBar segments={segments} draft={draft} />
      </div>
      <Text size='1' color='gray'>
        Drag a boundary on the bar to resize the two neighbouring regions.
      </Text>
    </Flex>
  );
}
