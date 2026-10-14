import { Card, Flex, Text } from '@radix-ui/themes';

import { REGION_TERRAIN_SUPPORT } from '../../../../../utils/map-generator/stages/heightmap';
import type {
  GeologicalRegionType,
  RegionTerrainConfig,
} from '../../../../../utils/map-generator/types';
import { regionStyle } from '../../../../../utils/map-layers';
import { SliderField } from '../../../../slider-field';
import { TERRAIN_SLIDER_OPTIONS, terrainParameterPatch } from '../lib/terrain-options';

const percent = (value: number): string => `${Math.round(value * 100)}%`;

export interface RegionTerrainEditorProps {
  index: number;
  type: GeologicalRegionType;
  terrain: RegionTerrainConfig;
  onChange: (patch: Partial<RegionTerrainConfig>) => void;
}

/** Terrain sliders of one region: only the parameters its type consumes. */
export function RegionTerrainEditor({ index, type, terrain, onChange }: RegionTerrainEditorProps) {
  const style = regionStyle(type);
  const supported = new Set(REGION_TERRAIN_SUPPORT[type]);
  const options = TERRAIN_SLIDER_OPTIONS.filter(option => supported.has(option.id));
  return (
    <Card variant='surface'>
      <Flex direction='column' gap='3'>
        <Text size='2' weight='bold'>{`Region ${index + 1} — ${style.label}`}</Text>
        <Text size='1' color='gray'>
          {style.description}
        </Text>
        {options.map(option => (
          <SliderField
            key={option.id}
            label={option.label}
            description={option.description}
            value={terrain[option.id]}
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
