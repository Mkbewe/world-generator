import { memo } from 'react';
import { Card, Flex } from '@radix-ui/themes';

import type { MacroRegionConfig } from '../../../../../../utils/map-generator/types';
import { RegionCardDanger } from '../region-card-danger';
import { RegionCardHeader } from '../region-card-header';

interface BaseRegionCardProps {
  region: MacroRegionConfig;
  index: number;
  canRemove: boolean;
}

/** Memoized so a boundary drag only re-renders the two cards it resizes. */
export const BaseRegionCard = memo(function BaseRegionCard({
  region,
  index,
  canRemove,
}: BaseRegionCardProps) {
  return (
    <Card size='1' variant='surface'>
      <Flex direction='column' gap='2'>
        <RegionCardHeader region={region} index={index} canRemove={canRemove} />
        <RegionCardDanger region={region} />
      </Flex>
    </Card>
  );
});
