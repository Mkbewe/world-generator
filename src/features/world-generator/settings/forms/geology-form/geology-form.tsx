import { useTranslation } from 'react-i18next';
import { MAX_GEOLOGICAL_REGIONS, MIN_GEOLOGICAL_REGIONS } from '@generator/stages/geology';
import type { GeologicalRegionConfig } from '@generator/types';
import { geologyRegionColor } from '@layers';
import { Button, Flex, Text } from '@radix-ui/themes';

import { useRegionDistribution } from './hooks/use-region-distribution';
import { PRESET_OPTIONS } from './lib/preset-options';
import { GeologicalRegionCard } from './geological-region-card';
import {
  type ColorSwatchTabOption,
  ColorSwatchTabs,
} from '../../../../../components/color-swatch-tabs';
import { DistributionBar } from '../../../../../components/distribution-bar';
import { SliderField } from '../../../../../components/slider-field';
import {
  applyGeologyPreset,
  updateGeologicalRegion,
  useGeologyFormStore,
} from '../../../../../stores';
import type { RegionLink } from '../../lib/region-data';
import { percent } from '../lib/percent';
import { regionId } from '../lib/region-id';
import { GEOLOGY_SHARE_COPY } from '../lib/share-copy';

interface GeologyFormProps {
  regionLink: RegionLink<GeologicalRegionConfig>;
}

/** Starter presets, shared layout and per-region settings of the geology map. */
export function GeologyForm({ regionLink }: GeologyFormProps): React.JSX.Element {
  const { t } = useTranslation();
  const layout = useGeologyFormStore(state => state.layout);
  const setRegionCount = useGeologyFormStore(state => state.setRegionCount);
  const setLayout = useGeologyFormStore(state => state.setLayout);
  const setRegionShareBoundary = useGeologyFormStore(state => state.setRegionShareBoundary);
  const {
    data: { regions: activeSlots, selectedIndex, selectedId, selectedRegion },
    actions: { selectRegionById },
  } = regionLink;
  const regionTypes = activeSlots.map(slot => slot.type);
  const tabItems: readonly ColorSwatchTabOption[] = regionTypes.map((type, index) => ({
    id: regionId(index),
    label: t('common.regionName', { index: index + 1 }),
    color: geologyRegionColor(type, index),
  }));
  const { segments, draft, minShare } = useRegionDistribution(activeSlots, setRegionShareBoundary);
  const distributionSegments = segments.map((segment, index) => ({
    ...segment,
    color: geologyRegionColor(regionTypes[index], index),
  }));

  return (
    <Flex direction='column' gap='4'>
      <Text size='1' color='gray'>
        {t('forms.geology.intro')}
      </Text>
      <Flex gap='2' wrap='wrap'>
        {PRESET_OPTIONS.map(option => (
          <Button
            key={option.id}
            type='button'
            size='2'
            variant='surface'
            onClick={() => applyGeologyPreset(option.id)}
          >
            {t(option.labelKey)}
          </Button>
        ))}
      </Flex>
      <SliderField
        label={t('forms.geology.regions')}
        description={t('forms.geology.regionsDescription')}
        value={activeSlots.length}
        min={MIN_GEOLOGICAL_REGIONS}
        max={MAX_GEOLOGICAL_REGIONS}
        step={1}
        format={value => value.toFixed(0)}
        rangeLabels={[t('forms.geology.rangeOne'), `${MAX_GEOLOGICAL_REGIONS}`]}
        onChange={setRegionCount}
      />
      {activeSlots.length > 1 && (
        <DistributionBar
          groupAriaLabel={t('forms.geology.areaAria')}
          segments={distributionSegments}
          draft={draft}
          selectedId={selectedId}
          minShare={minShare}
          header={{
            label: t(GEOLOGY_SHARE_COPY.labelKey),
            description: t(GEOLOGY_SHARE_COPY.descriptionKey),
          }}
        />
      )}
      <SliderField
        label={t('forms.geology.evenness')}
        description={t('forms.geology.evennessDescription')}
        value={layout.evenness}
        min={0}
        max={1}
        step={0.05}
        format={percent}
        rangeLabels={[t('forms.geology.rangeClustered'), t('forms.geology.rangeEven')]}
        onChange={evenness => setLayout({ evenness })}
      />
      <SliderField
        label={t('forms.geology.borderIrregularity')}
        description={t('forms.geology.borderIrregularityDescription')}
        value={layout.irregularity}
        min={0}
        max={1}
        step={0.05}
        format={percent}
        rangeLabels={[t('forms.geology.rangeClean'), t('forms.geology.rangeRagged')]}
        onChange={irregularity => setLayout({ irregularity })}
      />
      <ColorSwatchTabs
        items={tabItems}
        selectedId={selectedId}
        onSelect={selectRegionById}
        ariaLabel={t('forms.geology.regionsAria')}
      />
      <GeologicalRegionCard
        index={selectedIndex}
        region={selectedRegion}
        selection={{
          ids: tabItems.map(item => item.id),
          selectedId,
          onSelect: selectRegionById,
        }}
        onChange={patch => updateGeologicalRegion(selectedIndex, patch)}
      />
    </Flex>
  );
}
