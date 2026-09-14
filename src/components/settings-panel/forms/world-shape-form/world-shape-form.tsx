import { Flex } from '@radix-ui/themes';

import { useSizeInput } from './lib/use-size-input';
import type { WorldShape, WorldSize } from './lib/world-shape';
import { ShapeField } from './shape-field';
import { SizeInputField } from './size-input-field';
import { SizePresetField } from './size-preset-field';

interface WorldShapeFormProps {
  shape: WorldShape;
  size: WorldSize;
  onShapeChange: (shape: WorldShape) => void;
  onSizeChange: (size: WorldSize) => void;
}

export function WorldShapeForm({ shape, size, onShapeChange, onSizeChange }: WorldShapeFormProps) {
  const sizeInput = useSizeInput(size, onSizeChange);

  return (
    <Flex direction='column' gap='3'>
      <ShapeField shape={shape} onShapeChange={onShapeChange} />
      <SizePresetField size={size} onSelect={sizeInput.apply} />
      <SizeInputField
        value={sizeInput.value}
        onChange={sizeInput.setValue}
        onCommit={sizeInput.commit}
      />
    </Flex>
  );
}
