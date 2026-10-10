import { useState } from 'react';
import { Link } from 'react-router';
import { Button, Card, Flex, Heading, Text } from '@radix-ui/themes';

import { useStatisticsSnapshot } from './hooks/use-statistics-snapshot';
import { downloadStatisticsExport, statisticsExportFileName } from './lib/statistics-export';
import { ExportDialog } from '../../components/export-dialog';
import { GenerationStatisticsPanel } from '../../components/generation-statistics';
import { MapStatisticsPanel } from '../../components/map-statistics';
import { RenderStatisticsPanel } from '../../components/render-statistics';

export function StatisticsPage() {
  const snapshot = useStatisticsSnapshot();
  const [isExportOpen, setIsExportOpen] = useState(false);

  if (!snapshot || snapshot.generation.statistics.length === 0) {
    return (
      <Card size={{ initial: '2', sm: '3' }}>
        <Flex direction='column' align='center' gap='4'>
          <Heading size='5' color='violet'>
            No statistics yet
          </Heading>
          <Text size='3' color='gray' align='center'>
            Generate a world to see pipeline statistics.
          </Text>
          <Button asChild>
            <Link to='/'>Back to generator</Link>
          </Button>
        </Flex>
      </Card>
    );
  }

  const handleExport = (format: string): void => {
    if (format !== 'json') {
      return;
    }
    downloadStatisticsExport(snapshot, statisticsExportFileName(snapshot.world));
  };

  return (
    <Flex direction='column' gap='5'>
      <Flex justify='end'>
        <Button onClick={() => setIsExportOpen(true)}>Export</Button>
      </Flex>
      <MapStatisticsPanel
        world={snapshot.world}
        totalDurationMs={
          snapshot.rendering?.elapsedDurationMs ?? snapshot.generation.totalDurationMs
        }
      />
      <GenerationStatisticsPanel statistics={snapshot.generation} />
      {snapshot.rendering && <RenderStatisticsPanel statistics={snapshot.rendering} />}
      <ExportDialog
        isOpen={isExportOpen}
        onOpenChange={setIsExportOpen}
        title='Export Statistics'
        description='Download the map configuration, generation statistics and render statistics as JSON?'
        formats={[{ id: 'json', label: 'JSON file' }]}
        onExport={handleExport}
      />
    </Flex>
  );
}
