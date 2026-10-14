import { Button, Flex, Text } from '@radix-ui/themes';

import { useGeologySelection } from './hooks/use-geology-selection';
import { useRegionDistribution } from './hooks/use-region-distribution';
import { percent } from './lib/percent';
import { PRESET_OPTIONS } from './lib/preset-options';
import { RegionDistribution } from './region-distribution';
import { RegionEditor } from './region-editor';
import { useGeologyFormStore, useHeightmapFormStore } from '../../../../stores';
import {
  type GeologyPreset,
  geologyPresetConfig,
  MAX_GEOLOGICAL_REGIONS,
  MIN_GEOLOGICAL_REGIONS,
} from '../../../../utils/map-generator/stages/geology';
import { defaultRegionTerrain } from '../../../../utils/map-generator/stages/heightmap';
import type { GeologicalRegionConfig } from '../../../../utils/map-generator/types';
import { geologyRegionColor } from '../../../../utils/map-layers';
import { type RegionTabItem, RegionTabs } from '../../../region-tabs';
import { SliderField } from '../../../slider-field';

/** Starter presets, shared layout and per-region settings of the geology map. */
export function GeologyForm(): React.JSX.Element {
  const regionCount = useGeologyFormStore(state => state.regionCount);
  const layout = useGeologyFormStore(state => state.layout);
  const slots = useGeologyFormStore(state => state.slots);
  const setRegionCount = useGeologyFormStore(state => state.setRegionCount);
  const setLayout = useGeologyFormStore(state => state.setLayout);
  const setRegion = useGeologyFormStore(state => state.setRegion);
  const setRegionShareBoundary = useGeologyFormStore(state => state.setRegionShareBoundary);
  const applyPreset = useGeologyFormStore(state => state.applyPreset);
  const setRegionTerrain = useHeightmapFormStore(state => state.setRegionTerrain);
  const resetRegionTerrains = useHeightmapFormStore(state => state.resetRegionTerrains);
  const activeSlots = slots.slice(0, regionCount);
  const regionTypes = activeSlots.map(slot => slot.type);
  const tabItems: readonly RegionTabItem[] = regionTypes.map((type, index) => ({
    id: `region-${index + 1}`,
    label: `Region ${index + 1}`,
    color: geologyRegionColor(type, index),
  }));
  const { selectedIndex, region, selectRegion } = useGeologySelection(regionCount, slots);
  const { segments, draft, minShare } = useRegionDistribution(activeSlots, setRegionShareBoundary);

  /** A preset resets every region's terrain to the defaults of its type. */
  const applyPresetWithTerrain = (preset: GeologyPreset): void => {
    applyPreset(preset);
    resetRegionTerrains(geologyPresetConfig(preset).regions.map(entry => entry.type));
  };

  /** A type change swaps the region's terrain for the defaults of the new type. */
  const changeRegion = (patch: Partial<GeologicalRegionConfig>): void => {
    setRegion(selectedIndex, patch);
    if (patch.type) {
      setRegionTerrain(selectedIndex, defaultRegionTerrain(patch.type));
    }
  };

  return (
    <Flex direction='column' gap='4'>
      <Text size='1' color='gray'>
        Regions cover the whole world with irregular borders. A preset fills the settings once;
        every later change stays yours.
      </Text>
      <Flex gap='2' wrap='wrap'>
        {PRESET_OPTIONS.map(option => (
          <Button
            key={option.id}
            type='button'
            size='2'
            variant='surface'
            onClick={() => applyPresetWithTerrain(option.id)}
          >
            {option.label}
          </Button>
        ))}
      </Flex>
      <SliderField
        label='Regions'
        description='How many regions share the world.'
        value={regionCount}
        min={MIN_GEOLOGICAL_REGIONS}
        max={MAX_GEOLOGICAL_REGIONS}
        step={1}
        format={value => value.toFixed(0)}
        rangeLabels={['One', `${MAX_GEOLOGICAL_REGIONS}`]}
        onChange={setRegionCount}
      />
      {regionCount > 1 && (
        <RegionDistribution
          segments={segments}
          draft={draft}
          minShare={minShare}
          types={regionTypes}
        />
      )}
      <SliderField
        label='Evenness'
        description='How evenly the region anchors spread over the world.'
        value={layout.evenness}
        min={0}
        max={1}
        step={0.05}
        format={percent}
        rangeLabels={['Clustered', 'Even']}
        onChange={evenness => setLayout({ evenness })}
      />
      <SliderField
        label='Border irregularity'
        description='How much noise displaces the region borders.'
        value={layout.irregularity}
        min={0}
        max={1}
        step={0.05}
        format={percent}
        rangeLabels={['Clean', 'Ragged']}
        onChange={irregularity => setLayout({ irregularity })}
      />
      <RegionTabs
        items={tabItems}
        selectedIndex={selectedIndex}
        onSelect={selectRegion}
        ariaLabel='Geology regions'
      />
      <RegionEditor index={selectedIndex} region={region} onChange={changeRegion} />
    </Flex>
  );
}
