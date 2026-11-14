import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { MAX_MACRO_REGIONS } from '@generator/stages/macro-region/defaults';
import { regionColor } from '@layers';
import { PlusIcon } from '@radix-ui/react-icons';
import { Button, Flex, Text } from '@radix-ui/themes';

import {
  type ColorSwatchTabOption,
  ColorSwatchTabs,
} from '../../../../../../components/color-swatch-tabs';
import { DistributionBar, useBoundaryDraft } from '../../../../../../components/distribution-bar';
import { useIdSelection } from '../../../../../../hooks/use-id-selection';
import {
  baseRegions,
  clampBoundaries,
  MIN_MACRO_REGION_SHARE,
  regionBoundaries,
  regionSegments,
  useMacroRegionFormStore,
} from '../../../../../../stores';
import { macroRegionShareCopy } from '../../lib/share-copy';
import { BaseRegionCard } from '../region-card';

/** Base regions: the share bar, their tabs and the selected region fields. */
export function BaseRegionSection() {
  const { t } = useTranslation();
  const regions = useMacroRegionFormStore(state => state.regions);
  const layout = useMacroRegionFormStore(state => state.layout);
  const setRegionBoundaries = useMacroRegionFormStore(state => state.setRegionBoundaries);
  const addBaseRegion = useMacroRegionFormStore(state => state.addBaseRegion);
  // Stable ids and callbacks keep the memoized BaseRegionCard from re-rendering on boundary drags.
  const base = useMemo(() => baseRegions(regions), [regions]);
  const ids = useMemo(() => base.map(region => region.id), [base]);
  const { selectedItem: region, selectedIndex, selectedId, selectId } = useIdSelection(base);
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
  const tabItems: readonly ColorSwatchTabOption[] = base.map((item, index) => ({
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
      <DistributionBar
        groupAriaLabel={t('forms.macroRegion.regionBoundariesAria')}
        segments={segments}
        draft={draft}
        selectedId={selectedId}
        minShare={MIN_MACRO_REGION_SHARE}
        header={{
          label: t(shareCopy.labelKey),
          description: t(shareCopy.descriptionKey),
        }}
      />
      <ColorSwatchTabs
        items={tabItems}
        selectedId={selectedId}
        onSelect={selectId}
        ariaLabel={t('forms.macroRegion.baseRegionsAria')}
      />
      {region && (
        <BaseRegionCard
          region={region}
          index={selectedIndex}
          canRemove={base.length > 1}
          selectionIds={ids}
          selectedId={selectedId}
          onSelect={selectId}
        />
      )}
    </Flex>
  );
}
