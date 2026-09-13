import { useState } from 'react';
import { Flex, SegmentedControl, Text, TextField } from '@radix-ui/themes';

export type WorldShape = 'disc' | 'rectangle';
export type WorldSize = number;

export const MIN_WORLD_SIZE = 100;
export const MAX_WORLD_SIZE = 10000;

const SIZE_PRESETS = [
  { value: 'small', label: 'Small', size: 600 },
  { value: 'medium', label: 'Medium', size: 2400 },
  { value: 'big', label: 'Big', size: 5000 },
] as const;

interface WorldShapeFormProps {
  shape: WorldShape;
  size: WorldSize;
  onShapeChange: (shape: WorldShape) => void;
  onSizeChange: (size: WorldSize) => void;
}

export function WorldShapeForm({ shape, size, onShapeChange, onSizeChange }: WorldShapeFormProps) {
  const [sizeInput, setSizeInput] = useState(String(size));

  const commitSize = (): void => {
    const parsedSize = Number(sizeInput);
    const nextSize = Number.isInteger(parsedSize)
      ? Math.min(MAX_WORLD_SIZE, Math.max(MIN_WORLD_SIZE, parsedSize))
      : size;

    setSizeInput(String(nextSize));

    if (nextSize !== size) {
      onSizeChange(nextSize);
    }
  };

  const applySizePreset = (nextSize: WorldSize): void => {
    setSizeInput(String(nextSize));
    onSizeChange(nextSize);
  };

  const activePreset = SIZE_PRESETS.find(preset => preset.size === size)?.value;

  return (
    <Flex direction='column' gap='3'>
      <Flex direction='column' gap='2'>
        <Text size='2' color='gray'>
          Shape:
        </Text>
        <SegmentedControl.Root
          value={shape}
          size='2'
          aria-label='World shape'
          onValueChange={value => onShapeChange(value as WorldShape)}
        >
          <SegmentedControl.Item value='disc'>Disc</SegmentedControl.Item>
          <SegmentedControl.Item value='rectangle'>Rectangle</SegmentedControl.Item>
        </SegmentedControl.Root>
      </Flex>
      <Flex direction='column' gap='2'>
        <Text size='2' color='gray'>
          Size preset:
        </Text>
        <SegmentedControl.Root
          value={activePreset}
          size='2'
          onValueChange={value => {
            const preset = SIZE_PRESETS.find(item => item.value === value);
            if (preset) {
              applySizePreset(preset.size);
            }
          }}
        >
          {SIZE_PRESETS.map(preset => (
            <SegmentedControl.Item key={preset.value} value={preset.value}>
              {preset.label}
            </SegmentedControl.Item>
          ))}
        </SegmentedControl.Root>
        {activePreset && (
          <Text size='1' color='gray'>
            {size} × {size} px
          </Text>
        )}
      </Flex>
      <Flex direction='column' gap='2'>
        <Text as='label' htmlFor='world-shape-form-size' size='2' color='gray'>
          Custom size:
        </Text>
        <TextField.Root
          id='world-shape-form-size'
          type='number'
          min={MIN_WORLD_SIZE}
          max={MAX_WORLD_SIZE}
          step='1'
          value={sizeInput}
          onChange={event => setSizeInput(event.target.value)}
          onBlur={commitSize}
          onKeyDown={event => {
            if (event.key === 'Enter') {
              event.currentTarget.blur();
            }
          }}
        >
          <TextField.Slot side='right'>px</TextField.Slot>
        </TextField.Root>
      </Flex>
    </Flex>
  );
}
