import { Card, Flex, Heading, Separator, Table, Text } from '@radix-ui/themes';

import type { StageStatistics } from '../../utils/map-generator';

function formatDuration(durationMs: number | undefined): string {
  return durationMs === undefined ? '—' : `${durationMs.toFixed(1)} ms`;
}

function formatDetailValue(value: string | number): string {
  return typeof value === 'number' ? value.toFixed(3) : value;
}

function formatDetails(details: StageStatistics['details']): string {
  if (!details) {
    return '—';
  }

  const entries = Object.entries(details);

  if (entries.length === 0) {
    return '—';
  }

  return entries.map(([key, value]) => `${key} ${formatDetailValue(value)}`).join(', ');
}

interface GenerationStatisticsProps {
  statistics: readonly StageStatistics[];
  totalDurationMs?: number;
}

export function GenerationStatistics({ statistics, totalDurationMs }: GenerationStatisticsProps) {
  return (
    <Card size={{ initial: '2', sm: '3' }}>
      <Flex direction='column' gap='4'>
        <Heading size='5' color='violet'>
          Statistics
        </Heading>
        <Separator size='4' />
        <Table.Root size='1' variant='surface'>
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeaderCell>Stage</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Time</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Details</Table.ColumnHeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {statistics.map(stageStatistics => (
              <Table.Row key={stageStatistics.stageId}>
                <Table.RowHeaderCell>{stageStatistics.stageName}</Table.RowHeaderCell>
                <Table.Cell>{formatDuration(stageStatistics.durationMs)}</Table.Cell>
                <Table.Cell>{formatDetails(stageStatistics.details)}</Table.Cell>
              </Table.Row>
            ))}
            <Table.Row>
              <Table.RowHeaderCell>
                <Text weight='bold'>Total</Text>
              </Table.RowHeaderCell>
              <Table.Cell>
                <Text weight='bold'>{formatDuration(totalDurationMs)}</Text>
              </Table.Cell>
              <Table.Cell>—</Table.Cell>
            </Table.Row>
          </Table.Body>
        </Table.Root>
      </Flex>
    </Card>
  );
}
