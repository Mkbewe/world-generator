import { Flex, Text } from '@radix-ui/themes';

import { MIN_MACRO_REGION_SHARE } from '../../../../../utils/map-generator/stages/macro-region/editor/boundary-model';
import { type BoundaryDraft, DistributionBar } from '../../../../distribution-bar';
import type { DistributionSegment } from '../../../../lib/distribution-segment';
import type { ShareCopy } from '../../lib/share-copy';

interface RegionDistributionProps {
  segments: readonly DistributionSegment[];
  draft: BoundaryDraft;
  /** Name and explanation of the share, e.g. ring thickness along the radius. */
  header: ShareCopy;
}

export function RegionDistribution({ segments, draft, header }: RegionDistributionProps) {
  return (
    <Flex direction='column' gap='2'>
      <div role='group' aria-label='Region boundaries'>
        <DistributionBar
          segments={segments}
          draft={draft}
          minShare={MIN_MACRO_REGION_SHARE}
          header={header}
        />
      </div>
      <Text size='1' color='gray'>
        Drag a boundary on the bar to resize the two neighbouring regions.
      </Text>
    </Flex>
  );
}
