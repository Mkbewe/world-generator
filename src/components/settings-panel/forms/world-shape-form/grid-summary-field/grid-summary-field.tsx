import { Flex, Text } from '@radix-ui/themes';

import { formatBytes } from '../../../../../utils/format';
import { summarizeWorldGrid } from '../../../../../utils/world-grid';

interface GridSummaryFieldProps {
  sizeMeters: number;
  metersPerSample: number;
}

/** Shows the derived sample grid and the estimated memory before generating. */
export function GridSummaryField({ sizeMeters, metersPerSample }: GridSummaryFieldProps) {
  const grid = summarizeWorldGrid(sizeMeters, metersPerSample);
  const effective = grid.metersPerSample;
  const effectiveLabel = effective >= 1 ? effective.toFixed(0) : effective.toFixed(1);

  return (
    <Flex direction='column' gap='1'>
      <Text size='1' color='gray'>
        {grid.dimensions.sampleWidth} × {grid.dimensions.sampleHeight} samples ·{' '}
        {formatBytes(grid.memoryBytes)} data · {effectiveLabel} m per sample
      </Text>
      {grid.clamped && (
        <Text size='1' color='orange'>
          {metersPerSample} m per sample does not fit the sample budget; generation uses{' '}
          {effectiveLabel} m per sample. Pick a bigger detail step to match it.
        </Text>
      )}
    </Flex>
  );
}
