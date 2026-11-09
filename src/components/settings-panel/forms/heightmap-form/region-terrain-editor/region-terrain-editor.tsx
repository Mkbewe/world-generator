import { useTranslation } from 'react-i18next';
import { REGION_TERRAIN_SUPPORT } from '@generator/stages/heightmap';
import type { GeologicalRegionType, RegionTerrainConfig } from '@generator/types';
import { Card, Flex, Text } from '@radix-ui/themes';

import { percent } from '../../../../lib/percent';
import { SliderField } from '../../../../slider-field';
import { regionTypeOption } from '../../geology-form/lib/region-options';
import { TERRAIN_SLIDER_OPTIONS, terrainParameterPatch } from '../lib/terrain-options';

export interface RegionTerrainEditorProps {
  index: number;
  type: GeologicalRegionType;
  terrain: RegionTerrainConfig;
  onChange: (patch: Partial<RegionTerrainConfig>) => void;
}

/** Terrain sliders of one region: only the parameters its type consumes. */
export function RegionTerrainEditor({ index, type, terrain, onChange }: RegionTerrainEditorProps) {
  const { t } = useTranslation();
  const style = regionTypeOption(type);
  const supported = new Set(REGION_TERRAIN_SUPPORT[type]);
  const options = TERRAIN_SLIDER_OPTIONS.filter(option => supported.has(option.id));
  return (
    <Card variant='surface'>
      <Flex direction='column' gap='3'>
        <Text size='2' weight='bold'>
          {t('forms.heightmap.regionTitle', {
            index: index + 1,
            type: t(style.labelKey),
          })}
        </Text>
        <Text size='1' color='gray'>
          {t(style.descriptionKey)}
        </Text>
        {options.map(option => (
          <SliderField
            key={option.id}
            label={t(option.labelKey)}
            description={t(option.descriptionKey)}
            value={terrain[option.id]}
            min={0}
            max={1}
            step={0.05}
            format={percent}
            rangeLabels={[t(option.rangeLabelKeys[0]), t(option.rangeLabelKeys[1])]}
            onChange={value => onChange(terrainParameterPatch(option.id, value))}
          />
        ))}
      </Flex>
    </Card>
  );
}
