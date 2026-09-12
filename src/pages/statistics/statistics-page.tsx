import { Link } from 'react-router';
import { Button, Card, Flex, Heading, Text } from '@radix-ui/themes';

import { GenerationStatisticsPanel } from '../../components/generation-statistics';
import { MapStatisticsPanel } from '../../components/map-statistics';
import { RenderStatisticsPanel } from '../../components/render-statistics';
import {
  useGenerationStatisticsStore,
  useMapConfigStore,
  useRenderStatisticsStore,
} from '../../stores';

export function StatisticsPage() {
  const generation = useGenerationStatisticsStore(state => state.result);
  const config = useMapConfigStore(state => state.config);
  const renderStatistics = useRenderStatisticsStore(state => state.statistics);

  if (!generation || generation.statistics.length === 0) {
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

  return (
    <Flex direction='column' gap='5'>
      {config && <MapStatisticsPanel world={config.world} />}
      <GenerationStatisticsPanel statistics={generation} />
      {renderStatistics && <RenderStatisticsPanel statistics={renderStatistics} />}
    </Flex>
  );
}
