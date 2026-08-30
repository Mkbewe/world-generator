import { Card, Flex, Heading, Separator, Table, Text } from '@radix-ui/themes';

import type { StageStatistics } from '../../utils/map-generator';

function formatDuration(durationMs: number | undefined): string {
  return durationMs === undefined ? '—' : `${durationMs.toFixed(1)} ms`;
}

interface Stage {
  id: string;
  name: string;
}

interface GenerationStatisticsProps {
  stages: readonly Stage[];
  statistics: readonly StageStatistics[];
  totalDurationMs?: number;
  valueRange?: { min: number; max: number };
}

export function GenerationStatistics({
  stages,
  statistics,
  totalDurationMs,
  valueRange,
}: GenerationStatisticsProps) {
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
            {stages.map(stage => {
              const stageStatistics = statistics.find(item => item.stageId === stage.id);

              return (
                <Table.Row key={stage.id}>
                  <Table.RowHeaderCell>{stage.name}</Table.RowHeaderCell>
                  <Table.Cell>{formatDuration(stageStatistics?.durationMs)}</Table.Cell>
                  <Table.Cell>
                    {stage.id === 'noise' && valueRange
                      ? `Range ${valueRange.min.toFixed(3)}–${valueRange.max.toFixed(3)}`
                      : '—'}
                  </Table.Cell>
                </Table.Row>
              );
            })}
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
