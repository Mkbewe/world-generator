import { useTranslation } from 'react-i18next';
import {
  defaultRegionTerrain,
  MAX_ISLET_FREQUENCY,
  MAX_RELIEF,
  MIN_ISLET_FREQUENCY,
  MIN_RELIEF,
} from '@generator/stages/heightmap';
import { geologyRegionColor } from '@layers';
import { Flex } from '@radix-ui/themes';

import { HeightmapTerrainCard } from './heightmap-terrain-card';
import {
  type ColorSwatchTabOption,
  ColorSwatchTabs,
} from '../../../../../components/color-swatch-tabs';
import { SliderField } from '../../../../../components/slider-field';
import { useGeologyFormStore, useHeightmapFormStore } from '../../../../../stores';
import { useGeologySelection } from '../geology-form/hooks/use-geology-selection';
import { percent } from '../lib/percent';
import { regionId } from '../lib/region-id';

/** Global heightmap settings and the terrain sliders of every region. */
export function HeightmapForm(): React.JSX.Element {
  const { t } = useTranslation();
  const heightmap = useHeightmapFormStore(state => state.heightmap);
  const terrainSlots = useHeightmapFormStore(state => state.slots);
  const setRelief = useHeightmapFormStore(state => state.setRelief);
  const setIsletFrequency = useHeightmapFormStore(state => state.setIsletFrequency);
  const setRegionTerrain = useHeightmapFormStore(state => state.setRegionTerrain);
  const regionCount = useGeologyFormStore(state => state.regionCount);
  const slots = useGeologyFormStore(state => state.slots);
  const tabItems: readonly ColorSwatchTabOption[] = slots
    .slice(0, regionCount)
    .map((slot, index) => ({
      id: regionId(index),
      label: t('common.regionName', { index: index + 1 }),
      color: geologyRegionColor(slot.type, index),
    }));
  const { selectedIndex, selectedId, region, selectRegionById } = useGeologySelection(
    regionCount,
    slots
  );
  const terrain = terrainSlots[selectedIndex] ?? defaultRegionTerrain(region.type);

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
        type={region.type}
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
