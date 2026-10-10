import { Flex, Text } from '@radix-ui/themes';

import type { GeologicalRegionType } from '../../../../../utils/map-generator/types';
import { geologyRegionColor, regionStyle } from '../../../../../utils/map-layers';
import { type BoundaryDraft, DistributionBar } from '../../../../distribution-bar';
import type { DistributionSegment } from '../../../../lib/distribution-segment';
import { GEOLOGY_SHARE_COPY } from '../../lib/share-copy';

interface RegionDistributionProps {
  segments: readonly DistributionSegment[];
  draft: BoundaryDraft;
  minShare: number;
  types: readonly GeologicalRegionType[];
}

/** Direct area editor for geology regions. */
export function RegionDistribution({
  segments,
  draft,
  minShare,
  types,
}: RegionDistributionProps): React.JSX.Element {
  return (
    <Flex direction='column' gap='2'>
      <div role='group' aria-label='Geology region areas'>
        <DistributionBar
          segments={segments}
          draft={draft}
          minShare={minShare}
          ariaLabel='Geology region area distribution'
          header={GEOLOGY_SHARE_COPY}
          colorForIndex={index => geologyRegionColor(types[index], index)}
          labelForIndex={index =>
            `Region ${index + 1}: ${regionStyle(types[index]).label} (${Math.round(draft.shares[index] ?? 0)}%)`
          }
        />
      </div>
      <Text size='1' color='gray'>
        Drag a boundary to change the area of the two neighbouring regions.
      </Text>
    </Flex>
  );
}
