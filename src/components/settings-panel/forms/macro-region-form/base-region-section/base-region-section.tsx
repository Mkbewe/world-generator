import { PlusIcon } from '@radix-ui/react-icons';
import { Button, Flex, Text } from '@radix-ui/themes';

import { useMacroRegionFormStore } from '../../../../../stores';
import { MAX_MACRO_REGIONS } from '../../../../../utils/map-generator/stages/macro-region/defaults';
import {
  baseRegions,
  regionBoundaries,
  regionSegments,
} from '../../../../../utils/map-generator/stages/macro-region/editor/boundary-model';
import { RegionDistribution } from '../distribution';
import { useBoundaryDraft } from '../hooks/use-boundary-draft';
import { BaseRegionCard } from '../region-card';

export function BaseRegionSection() {
  const regions = useMacroRegionFormStore(state => state.regions);
  const layout = useMacroRegionFormStore(state => state.layout);
  const setRegionBoundaries = useMacroRegionFormStore(state => state.setRegionBoundaries);
  const addBaseRegion = useMacroRegionFormStore(state => state.addBaseRegion);
  const base = baseRegions(regions);
  const segments = regionSegments(layout, regions);
  const boundaries = regionBoundaries(layout, regions);
  const draft = useBoundaryDraft(boundaries, segments.length, setRegionBoundaries);
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
      <RegionDistribution segments={segments} draft={draft} />
      {base.map((region, index) => (
        <BaseRegionCard
          key={region.id}
          region={region}
          index={index}
          percent={draft.shares[index]}
          canRemove={base.length > 1}
        />
      ))}
    </Flex>
  );
}
