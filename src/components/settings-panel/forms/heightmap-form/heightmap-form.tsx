import { Flex } from '@radix-ui/themes';

import { RegionTerrainEditor } from './region-terrain-editor';
import { useGeologyFormStore, useHeightmapFormStore } from '../../../../stores';
import {
  defaultRegionTerrain,
  MAX_ISLET_FREQUENCY,
  MAX_RELIEF,
  MIN_ISLET_FREQUENCY,
  MIN_RELIEF,
} from '../../../../utils/map-generator/stages/heightmap';
import { geologyRegionColor } from '../../../../utils/map-layers';
import { type RegionTabItem, RegionTabs } from '../../../region-tabs';
import { SliderField } from '../../../slider-field';
import { useGeologySelection } from '../geology-form/hooks/use-geology-selection';

const percent = (value: number): string => `${Math.round(value * 100)}%`;

/** Global heightmap settings and the terrain sliders of every region. */
export function HeightmapForm(): React.JSX.Element {
  const heightmap = useHeightmapFormStore(state => state.heightmap);
  const terrainSlots = useHeightmapFormStore(state => state.slots);
  const setRelief = useHeightmapFormStore(state => state.setRelief);
  const setIsletFrequency = useHeightmapFormStore(state => state.setIsletFrequency);
  const setRegionTerrain = useHeightmapFormStore(state => state.setRegionTerrain);
  const regionCount = useGeologyFormStore(state => state.regionCount);
  const slots = useGeologyFormStore(state => state.slots);
  const tabItems: readonly RegionTabItem[] = slots.slice(0, regionCount).map((slot, index) => ({
    id: `region-${index + 1}`,
    label: `Region ${index + 1}`,
    color: geologyRegionColor(slot.type, index),
  }));
  const { selectedIndex, region, selectRegion } = useGeologySelection(regionCount, slots);
  const terrain = terrainSlots[selectedIndex] ?? defaultRegionTerrain(region.type);

  return (
    <Flex direction='column' gap='4'>
      <SliderField
        label='Relief'
        description='How high the land rises: 0 keeps islands flat, 1 builds steep mountains.'
        value={heightmap.relief}
        min={MIN_RELIEF}
        max={MAX_RELIEF}
        step={0.05}
        format={percent}
        rangeLabels={['Flat', 'Mountainous']}
        onChange={setRelief}
      />
      <SliderField
        label='Islets and rocks'
        description='How often small emergences rise out of the water near the shores.'
        value={heightmap.isletFrequency}
        min={MIN_ISLET_FREQUENCY}
        max={MAX_ISLET_FREQUENCY}
        step={0.05}
        format={percent}
        rangeLabels={['None', 'Many']}
        onChange={setIsletFrequency}
      />
      <RegionTabs
        items={tabItems}
        selectedIndex={selectedIndex}
        onSelect={selectRegion}
        ariaLabel='Heightmap regions'
      />
      <RegionTerrainEditor
        index={selectedIndex}
        type={region.type}
        terrain={terrain}
        onChange={patch => setRegionTerrain(selectedIndex, patch)}
      />
    </Flex>
  );
}
