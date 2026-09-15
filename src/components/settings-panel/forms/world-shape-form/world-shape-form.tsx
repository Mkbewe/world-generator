import { Flex } from '@radix-ui/themes';

import { useSizeInput } from './lib/use-size-input';
import type { WorldShape, WorldSize } from './lib/world-shape';
import { DetailField } from './detail-field';
import { GridSummaryField } from './grid-summary-field';
import { ShapeField } from './shape-field';
import { SizeInputField } from './size-input-field';
import { SizePresetField } from './size-preset-field';

interface WorldShapeFormProps {
  shape: WorldShape;
  sizeMeters: WorldSize;
  metersPerSample: number;
  onShapeChange: (shape: WorldShape) => void;
  onSizeChange: (sizeMeters: WorldSize) => void;
  onDetailChange: (metersPerSample: number) => void;
}

export function WorldShapeForm({
  shape,
  sizeMeters,
  metersPerSample,
  onShapeChange,
  onSizeChange,
  onDetailChange,
}: WorldShapeFormProps) {
  const sizeInput = useSizeInput(sizeMeters, onSizeChange);

  return (
    <Flex direction='column' gap='3'>
      <ShapeField shape={shape} onShapeChange={onShapeChange} />
      <SizePresetField sizeMeters={sizeMeters} onSelect={sizeInput.apply} />
      <SizeInputField
        value={sizeInput.value}
        onChange={sizeInput.setValue}
        onCommit={sizeInput.commit}
      />
      <DetailField metersPerSample={metersPerSample} onChange={onDetailChange} />
      <GridSummaryField sizeMeters={sizeMeters} metersPerSample={metersPerSample} />
    </Flex>
  );
}
