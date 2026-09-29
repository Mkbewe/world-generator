import { CopyIcon, TrashIcon } from '@radix-ui/react-icons';
import { Box, Button, Flex, Text, TextField } from '@radix-ui/themes';

import type { GeologicalAreaPatch } from '../../../../../stores';
import type { GeologicalAreaConfig } from '../../../../../utils/map-generator/types';
import { SliderField } from '../../../../slider-field';
import { areaControls, CHARACTER_COLORS, CHARACTER_LABELS } from '../lib/area-fields';
import styles from './area-card.module.scss';

interface AreaCardProps {
  readonly area: GeologicalAreaConfig;
  /** Why placement failed for this entry in the last run. */
  readonly problem?: string;
  /** Whether the list still has room for a copy. */
  readonly canDuplicate: boolean;
  readonly onChange: (patch: GeologicalAreaPatch) => void;
  readonly onDuplicate: () => void;
  readonly onRemove: () => void;
}

/** One editable area: its character and the few controls that shape it. */
export function AreaCard({
  area,
  problem,
  canDuplicate,
  onChange,
  onDuplicate,
  onRemove,
}: AreaCardProps) {
  const controls = areaControls(area, onChange);
  const [red, green, blue] = CHARACTER_COLORS[area.character];
  return (
    <Flex direction='column' gap='3' role='group' aria-label={area.id}>
      <Flex gap='2' align='center'>
        <Box
          aria-hidden
          className={styles.areaSwatch}
          style={{ backgroundColor: `rgb(${red}, ${green}, ${blue})` }}
        />
        <TextField.Root readOnly value={area.id} aria-label='Area id' className={styles.areaName} />
        <Text size='1' color='gray'>
          {CHARACTER_LABELS[area.character]}
        </Text>
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
      {problem ? (
        <Text size='1' color='red'>
          Could not be placed in the world: {problem}.
        </Text>
      ) : undefined}
      {controls.map(control => (
        <SliderField
          key={control.id}
          label={control.label}
          description={control.description}
          value={control.value}
          min={control.min}
          max={control.max}
          step={control.step}
          format={control.format}
          rangeLabels={control.rangeLabels}
          onChange={control.onChange}
        />
      ))}
    </Flex>
  );
}
