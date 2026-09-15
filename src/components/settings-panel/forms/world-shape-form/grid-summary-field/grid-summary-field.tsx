import { Flex, Text } from '@radix-ui/themes';

import { summarizeWorldGrid } from '../../../../../utils/map-generator/world-grid';

interface GridSummaryFieldProps {
  sizeMeters: number;
  metersPerSample: number;
}

/** Shows the derived sample grid and the estimated memory before generating. */
export function GridSummaryField({ sizeMeters, metersPerSample }: GridSummaryFieldProps) {
  const grid = summarizeWorldGrid(sizeMeters, metersPerSample);

  return (
    <Flex direction='column' gap='1'>
      <Text size='1' color='gray'>
        {grid.dimensions.sampleWidth} × {grid.dimensions.sampleHeight} samples ·{' '}
        {formatMemory(grid.memoryBytes)}
      </Text>
      {grid.clamped && (
        <Text size='1' color='orange'>
          Detail limited to {grid.metersPerSample.toFixed(1)} m per sample by the sample budget.
        </Text>
      )}
    </Flex>
  );
}

function formatMemory(bytes: number): string {
  const megabytes = bytes / 1_000_000;
  return megabytes >= 1
    ? `${Math.round(megabytes)} MB`
    : `${Math.max(1, Math.round(bytes / 1000))} KB`;
}
