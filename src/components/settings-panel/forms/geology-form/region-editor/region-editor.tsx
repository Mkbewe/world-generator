import { Card, Flex, SegmentedControl, Text } from '@radix-ui/themes';

import { REGION_TERRAIN_SUPPORT } from '../../../../../utils/map-generator/stages/geology';
import type { GeologicalRegionConfig } from '../../../../../utils/map-generator/types';
import { SliderField } from '../../../../slider-field';
import { percent } from '../lib/percent';
import { REGION_TYPE_OPTIONS } from '../lib/region-options';
import { TERRAIN_SLIDER_OPTIONS, terrainParameterPatch } from '../lib/terrain-options';

export interface RegionEditorProps {
  index: number;
  region: GeologicalRegionConfig;
  onChange: (patch: Partial<GeologicalRegionConfig>) => void;
}

/** Type, character and terrain sliders of the active region; its area is edited on the bar. */
export function RegionEditor({ index, region, onChange }: RegionEditorProps) {
  const selected = REGION_TYPE_OPTIONS.find(option => option.id === region.type);
  const supported = new Set(REGION_TERRAIN_SUPPORT[region.type]);
  const terrainOptions = TERRAIN_SLIDER_OPTIONS.filter(option => supported.has(option.id));
  return (
    <Card variant='surface'>
      <Flex direction='column' gap='3'>
        <Text size='2' weight='bold'>{`Region ${index + 1}`}</Text>
        <SegmentedControl.Root
          value={region.type}
          aria-label='Region type'
          onValueChange={value => {
            const option = REGION_TYPE_OPTIONS.find(item => item.id === value);
            if (option) {
              onChange({ type: option.id });
            }
          }}
        >
          {REGION_TYPE_OPTIONS.map(option => (
            <SegmentedControl.Item key={option.id} value={option.id}>
              {option.label}
            </SegmentedControl.Item>
          ))}
        </SegmentedControl.Root>
        {selected && <Text size='1' color='gray'>{`Character: ${selected.description}`}</Text>}
        {terrainOptions.map(option => (
          <SliderField
            key={option.id}
            label={option.label}
            description={option.description}
            value={region[option.id]}
            min={0}
            max={1}
            step={0.05}
            format={percent}
            rangeLabels={option.rangeLabels}
            onChange={value => onChange(terrainParameterPatch(option.id, value))}
          />
        ))}
      </Flex>
    </Card>
  );
}
