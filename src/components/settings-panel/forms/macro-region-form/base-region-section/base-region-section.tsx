import { useTranslation } from 'react-i18next';
import { PlusIcon } from '@radix-ui/react-icons';
import { Button, Flex, Text } from '@radix-ui/themes';

import { useMacroRegionFormStore } from '../../../../../stores';
import { MAX_MACRO_REGIONS } from '../../../../../utils/map-generator/stages/macro-region/defaults';
import { regionColor } from '../../../../../utils/map-layers';
import { useBoundaryDraft } from '../../../../distribution-bar';
import { type RegionTabItem, RegionTabs } from '../../../../region-tabs';
import { macroRegionShareCopy } from '../../lib/share-copy';
import { useMacroRegionSelection } from '../hooks/use-macro-region-selection';
import {
  baseRegions,
  clampBoundaries,
  regionBoundaries,
  regionSegments,
} from '../lib/boundary-model';
import { BaseRegionCard } from '../region-card';
import { RegionDistribution } from '../region-distribution';

/** Base regions: the share bar, their tabs and the selected region fields. */
export function BaseRegionSection() {
  const { t } = useTranslation();
  const regions = useMacroRegionFormStore(state => state.regions);
  const layout = useMacroRegionFormStore(state => state.layout);
  const setRegionBoundaries = useMacroRegionFormStore(state => state.setRegionBoundaries);
  const addBaseRegion = useMacroRegionFormStore(state => state.addBaseRegion);
  const base = baseRegions(regions);
  const { region, selectedIndex, selectRegion } = useMacroRegionSelection(base);
  const segments = regionSegments(layout, regions);
  const boundaries = regionBoundaries(layout, regions);
  const draft = useBoundaryDraft(
    boundaries,
    (current, index, value) =>
      clampBoundaries(
        current.map((boundary, position) => (position === index ? value(boundary) : boundary)),
        segments.length
      ),
    setRegionBoundaries
  );
  const atLimit = regions.length >= MAX_MACRO_REGIONS;
  const shareCopy = macroRegionShareCopy(layout === 'radial' ? 'ring' : 'band');
  const tabItems: readonly RegionTabItem[] = base.map((item, index) => ({
    id: item.id,
    label: item.label,
    color: regionColor(index),
  }));

  return (
    <Flex direction='column' gap='2'>
      <Flex justify='between' align='center'>
        <Text size='2' weight='bold' color='gray'>
          {t('forms.macroRegion.baseRegions', { count: base.length })}
        </Text>
        <Button size='1' variant='soft' onClick={addBaseRegion} disabled={atLimit}>
          <PlusIcon /> {t('forms.macroRegion.addRegion')}
        </Button>
      </Flex>
      <RegionDistribution segments={segments} draft={draft} header={shareCopy} />
      <RegionTabs
        items={tabItems}
        selectedIndex={selectedIndex}
        onSelect={selectRegion}
        ariaLabel={t('forms.macroRegion.baseRegionsAria')}
      />
      {region && (
        <BaseRegionCard region={region} index={selectedIndex} canRemove={base.length > 1} />
      )}
    </Flex>
  );
}
