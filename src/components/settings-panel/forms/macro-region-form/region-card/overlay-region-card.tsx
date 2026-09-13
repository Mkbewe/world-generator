import { Card, Flex, SegmentedControl } from '@radix-ui/themes';

import { DangerField } from './danger-field';
import { RegionHeader } from './region-header';
import { useMacroRegionFormStore } from '../../../../../stores';
import type { MacroRegionConfig } from '../../../../../utils/map-generator/types';
import { InfoLabel } from '../../../../info-label';
import { SliderField } from '../../../../slider-field';

export function OverlayRegionCard({ region, index }: { region: MacroRegionConfig; index: number }) {
  const updateOverlay = useMacroRegionFormStore(state => state.updateOverlay);
  if (region.geometry.kind !== 'band') {
    return null;
  }
  const geometry = region.geometry;

  return (
    <Card size='1' variant='surface'>
      <Flex direction='column' gap='2'>
        <RegionHeader region={region} index={index} />
        <Flex direction='column' gap='1'>
          <InfoLabel
            label='Direction'
            description='A horizontal band crosses west to east; a vertical band crosses north to south.'
          />
          <SegmentedControl.Root
            size='1'
            value={geometry.axis}
            onValueChange={axis => updateOverlay(region.id, { axis: axis as 'x' | 'y' })}
          >
            <SegmentedControl.Item value='y'>Horizontal</SegmentedControl.Item>
            <SegmentedControl.Item value='x'>Vertical</SegmentedControl.Item>
          </SegmentedControl.Root>
        </Flex>
        <SliderField
          label='Position'
          description='Position of the centre of the band on its axis.'
          value={geometry.center * 100}
          min={0}
          max={100}
          step={1}
          format={value => `${Math.round(value)}%`}
          onChange={center => updateOverlay(region.id, { center: center / 100 })}
        />
        <SliderField
          label='Width'
          description='How much of the world the band covers.'
          value={geometry.width * 100}
          min={5}
          max={100}
          step={1}
          format={value => `${Math.round(value)}%`}
          onChange={width => updateOverlay(region.id, { width: width / 100 })}
        />
        <DangerField region={region} />
      </Flex>
    </Card>
  );
}
