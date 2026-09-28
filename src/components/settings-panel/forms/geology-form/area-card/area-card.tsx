import { CopyIcon, TrashIcon } from '@radix-ui/react-icons';
import { Box, Button, Flex, SegmentedControl, Text, TextField } from '@radix-ui/themes';

import type { GeologicalAreaPatch } from '../../../../../stores';
import { normalizeDirection } from '../../../../../utils/map-generator/stages/geology';
import { isTerrainCharacter } from '../../../../../utils/map-generator/terrain-profile';
import type { GeologicalAreaConfig } from '../../../../../utils/map-generator/types';
import { characterStyle } from '../../../../../utils/map-layers';
import { SegmentedControlScroll } from '../../../../segmented-control-scroll';
import { SliderField } from '../../../../slider-field';
import { AREA_SLIDERS, numericPatch, RELIEFS } from '../lib/area-fields';
import styles from './area-card.module.scss';

interface AreaCardProps {
  readonly area: GeologicalAreaConfig;
  /** Placement failed for this entry in the last run. */
  readonly problem: boolean;
  /** Whether the list still has room for a copy. */
  readonly canDuplicate: boolean;
  readonly onChange: (patch: GeologicalAreaPatch) => void;
  readonly onDuplicate: () => void;
  readonly onRemove: () => void;
}

/** One editable area: relief, influence shape, bathymetry and uplifts. */
export function AreaCard({
  area,
  problem,
  canDuplicate,
  onChange,
  onDuplicate,
  onRemove,
}: AreaCardProps) {
  return (
    <Flex direction='column' gap='3' role='group' aria-label={area.id}>
      <Flex gap='2' align='center'>
        <Box
          aria-hidden
          className={styles.areaSwatch}
          style={{ backgroundColor: colorString(characterStyle(area.relief).color) }}
        />
        <TextField.Root readOnly value={area.id} aria-label='Area id' className={styles.areaName} />
        <Button
          size='1'
          variant='soft'
          disabled={!canDuplicate}
          onClick={onDuplicate}
          aria-label={`Duplicate ${area.id}`}
        >
          <CopyIcon />
        </Button>
        <Button
          size='1'
          variant='soft'
          color='red'
          onClick={onRemove}
          aria-label={`Remove ${area.id}`}
        >
          <TrashIcon />
        </Button>
      </Flex>
      <Flex direction='column' gap='2'>
        <Text size='2'>Relief</Text>
        <SegmentedControlScroll>
          <SegmentedControl.Root
            value={area.relief}
            onValueChange={relief => {
              if (isTerrainCharacter(relief)) {
                onChange({ relief });
              }
            }}
          >
            {RELIEFS.map(relief => (
              <SegmentedControl.Item key={relief.value} value={relief.value}>
                {relief.label}
              </SegmentedControl.Item>
            ))}
          </SegmentedControl.Root>
        </SegmentedControlScroll>
      </Flex>
      {problem ? (
        <Text size='1' color='red'>
          Could not be placed in the world: adjust its extent or relief.
        </Text>
      ) : undefined}
      <SliderField
        label='Rotation'
        description='Turns the area around its centre; it only shows when the shape is elliptical.'
        value={Math.round((area.direction * 180) / Math.PI)}
        min={0}
        max={355}
        step={5}
        format={value => `${value}°`}
        onChange={degrees => onChange({ direction: normalizeDirection((degrees * Math.PI) / 180) })}
      />
      {AREA_SLIDERS.map(slider => (
        <SliderField
          key={slider.key}
          label={slider.label}
          description={slider.description}
          value={area[slider.key]}
          min={slider.min}
          max={slider.max}
          step={slider.step}
          format={slider.format}
          rangeLabels={slider.rangeLabels}
          onChange={value => onChange(numericPatch(slider.key, value))}
        />
      ))}
    </Flex>
  );
}

function colorString(color: readonly [number, number, number]): string {
  return `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
}
