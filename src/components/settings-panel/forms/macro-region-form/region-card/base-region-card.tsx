import { Card, Flex, Text } from '@radix-ui/themes';

import { DangerField } from './danger-field';
import { RegionHeader } from './region-header';
import type { MacroRegionConfig } from '../../../../../utils/map-generator/types';

export function BaseRegionCard({
  region,
  index,
  percent,
  canRemove,
}: {
  region: MacroRegionConfig;
  index: number;
  percent: number;
  canRemove: boolean;
}) {
  return (
    <Card size='1' variant='surface'>
      <Flex direction='column' gap='2'>
        <RegionHeader region={region} index={index} canRemove={canRemove} />
        <Flex justify='between'>
          <Text size='1' color='gray'>
            Width
          </Text>
          <Text size='1' weight='bold'>
            {Math.round(percent)}%
          </Text>
        </Flex>
        <DangerField region={region} />
      </Flex>
    </Card>
  );
}
