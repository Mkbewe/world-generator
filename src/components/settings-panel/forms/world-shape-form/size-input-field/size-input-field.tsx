import { Flex, Text, TextField } from '@radix-ui/themes';

import { MAX_WORLD_SIZE, MIN_WORLD_SIZE } from '../lib/world-shape';

interface SizeInputFieldProps {
  value: string;
  onChange: (value: string) => void;
  onCommit: () => void;
}

export function SizeInputField({ value, onChange, onCommit }: SizeInputFieldProps) {
  return (
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
        value={value}
        onChange={event => onChange(event.target.value)}
        onBlur={onCommit}
        onKeyDown={event => {
          if (event.key === 'Enter') {
            event.currentTarget.blur();
          }
        }}
      >
        <TextField.Slot side='right'>m</TextField.Slot>
      </TextField.Root>
    </Flex>
  );
}
