import { PlusIcon } from '@radix-ui/react-icons';
import { Button, Flex, Text } from '@radix-ui/themes';

import { BaseRegionCard } from './region-card';
import { RegionDistribution } from './region-distribution';
import { useMacroRegionFormStore } from '../../../../stores';
import { MAX_MACRO_REGIONS } from '../../../../utils/map-generator/stages/macro-region-defaults';
import {
  baseRegions,
  regionSegments,
} from '../../../../utils/map-generator/stages/macro-region-sizes';

export function BaseRegionSection() {
  const regions = useMacroRegionFormStore(state => state.regions);
  const layout = useMacroRegionFormStore(state => state.layout);
  const addBaseRegion = useMacroRegionFormStore(state => state.addBaseRegion);
  const base = baseRegions(regions);
  const segments = regionSegments(layout, regions);
  const atLimit = regions.length >= MAX_MACRO_REGIONS;

  return (
    <Flex direction='column' gap='2'>
      <Flex justify='between' align='center'>
        <Text size='2' weight='bold' color='gray'>
          Base regions ({base.length})
        </Text>
        <Button size='1' variant='soft' onClick={addBaseRegion} disabled={atLimit}>
          <PlusIcon /> Add region
        </Button>
      </Flex>
      <RegionDistribution regions={regions} />
      {base.map((region, index) => (
        <BaseRegionCard
          key={region.id}
          region={region}
          index={index}
          percent={segments[index].percent}
          canRemove={base.length > 1}
        />
      ))}
    </Flex>
  );
}
