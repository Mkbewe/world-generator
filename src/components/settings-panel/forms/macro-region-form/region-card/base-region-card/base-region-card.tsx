import { memo } from 'react';
import { Card, Flex, Text } from '@radix-ui/themes';

import type { MacroRegionConfig } from '../../../../../../utils/map-generator/types';
import { RegionCardDanger } from '../region-card-danger';
import { RegionCardHeader } from '../region-card-header';

interface BaseRegionCardProps {
  region: MacroRegionConfig;
  index: number;
  percent: number;
  canRemove: boolean;
}

/** Memoized so a boundary drag only re-renders the two cards it resizes. */
export const BaseRegionCard = memo(function BaseRegionCard({
  region,
  index,
  percent,
  canRemove,
}: BaseRegionCardProps) {
  return (
    <Card size='1' variant='surface'>
      <Flex direction='column' gap='2'>
        <RegionCardHeader region={region} index={index} canRemove={canRemove} />
        <Flex justify='between'>
          <Text size='1' color='gray'>
            Width
          </Text>
          <Text size='1' weight='bold'>
            {Math.round(percent)}%
          </Text>
        </Flex>
        <RegionCardDanger region={region} />
      </Flex>
    </Card>
  );
});
