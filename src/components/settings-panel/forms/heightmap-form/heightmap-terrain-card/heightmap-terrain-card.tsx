import { useTranslation } from 'react-i18next';
import { REGION_TERRAIN_SUPPORT } from '@generator/stages/heightmap';
import type { GeologicalRegionType, RegionTerrainConfig } from '@generator/types';
import { geologyRegionColor } from '@layers';
import { Text } from '@radix-ui/themes';

import { EditorCard } from '../../../../editor-card';
import { EditorCardHeader } from '../../../../editor-card-header';
import {
  EditorCardSelectionControls,
  type EditorCardSelectionControlsProps,
} from '../../../../editor-card-selection-controls';
import { percent } from '../../../../lib/percent';
import { SliderField } from '../../../../slider-field';
import { regionTypeOption } from '../../geology-form/lib/region-options';
import { TERRAIN_SLIDER_OPTIONS, terrainParameterPatch } from '../lib/terrain-options';

interface HeightmapTerrainCardProps {
  index: number;
  type: GeologicalRegionType;
  terrain: RegionTerrainConfig;
  selection: EditorCardSelectionControlsProps;
  onChange: (patch: Partial<RegionTerrainConfig>) => void;
}

/** Terrain sliders of one region: only the parameters its type consumes. */
export function HeightmapTerrainCard({
  index,
  type,
  terrain,
  selection,
  onChange,
}: HeightmapTerrainCardProps) {
  const { t } = useTranslation();
  const style = regionTypeOption(type);
  const supported = new Set(REGION_TERRAIN_SUPPORT[type]);
  const options = TERRAIN_SLIDER_OPTIONS.filter(option => supported.has(option.id));

  return (
    <EditorCard>
      <EditorCardHeader
        color={geologyRegionColor(type, index)}
        actions={<EditorCardSelectionControls {...selection} />}
      >
        <Text size='2' weight='bold'>
          {t('forms.heightmap.regionTitle', {
            index: index + 1,
            type: t(style.labelKey),
          })}
        </Text>
      </EditorCardHeader>
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
    </EditorCard>
  );
}
