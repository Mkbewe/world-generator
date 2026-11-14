import { useTranslation } from 'react-i18next';
import {
  defaultRegionTerrain,
  MAX_ISLET_FREQUENCY,
  MAX_RELIEF,
  MIN_ISLET_FREQUENCY,
  MIN_RELIEF,
} from '@generator/stages/heightmap';
import type { GeologicalRegionConfig } from '@generator/types';
import { geologyRegionColor } from '@layers';
import { Flex } from '@radix-ui/themes';

import { HeightmapTerrainCard } from './heightmap-terrain-card';
import {
  type ColorSwatchTabOption,
  ColorSwatchTabs,
} from '../../../../../components/color-swatch-tabs';
import { SliderField } from '../../../../../components/slider-field';
import { useHeightmapFormStore } from '../../../../../stores';
import type { RegionLink } from '../../lib/region-data';
import { percent } from '../lib/percent';
import { regionId } from '../lib/region-id';

interface HeightmapFormProps {
  regionLink: RegionLink<GeologicalRegionConfig>;
}

/** Global heightmap settings and the terrain sliders of every region. */
export function HeightmapForm({ regionLink }: HeightmapFormProps): React.JSX.Element {
  const { t } = useTranslation();
  const heightmap = useHeightmapFormStore(state => state.heightmap);
  const terrainSlots = useHeightmapFormStore(state => state.slots);
  const setRelief = useHeightmapFormStore(state => state.setRelief);
  const setIsletFrequency = useHeightmapFormStore(state => state.setIsletFrequency);
  const setRegionTerrain = useHeightmapFormStore(state => state.setRegionTerrain);
  const {
    data: { regions, selectedIndex, selectedId, selectedRegion },
    actions: { selectRegionById },
  } = regionLink;
  const tabItems: readonly ColorSwatchTabOption[] = regions.map((slot, index) => ({
    id: regionId(index),
    label: t('common.regionName', { index: index + 1 }),
    color: geologyRegionColor(slot.type, index),
  }));
  const terrain = terrainSlots[selectedIndex] ?? defaultRegionTerrain(selectedRegion.type);

  return (
    <Flex direction='column' gap='4'>
      <SliderField
        label={t('forms.heightmap.relief')}
        description={t('forms.heightmap.reliefDescription')}
        value={heightmap.relief}
        min={MIN_RELIEF}
        max={MAX_RELIEF}
        step={0.05}
        format={percent}
        rangeLabels={[t('forms.heightmap.rangeFlat'), t('forms.heightmap.rangeMountainous')]}
        onChange={setRelief}
      />
      <SliderField
        label={t('forms.heightmap.islets')}
        description={t('forms.heightmap.isletsDescription')}
        value={heightmap.isletFrequency}
        min={MIN_ISLET_FREQUENCY}
        max={MAX_ISLET_FREQUENCY}
        step={0.05}
        format={percent}
        rangeLabels={[t('forms.heightmap.rangeNone'), t('forms.heightmap.rangeMany')]}
        onChange={setIsletFrequency}
      />
      <ColorSwatchTabs
        items={tabItems}
        selectedId={selectedId}
        onSelect={selectRegionById}
        ariaLabel={t('forms.heightmap.regionsAria')}
      />
      <HeightmapTerrainCard
        index={selectedIndex}
        type={selectedRegion.type}
        terrain={terrain}
        selection={{
          ids: tabItems.map(item => item.id),
          selectedId,
          onSelect: selectRegionById,
        }}
        onChange={patch => setRegionTerrain(selectedIndex, patch)}
      />
    </Flex>
  );
}
