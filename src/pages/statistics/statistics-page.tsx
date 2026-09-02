import { Link } from 'react-router';
import { Button, Card, Flex, Heading, Text } from '@radix-ui/themes';

import { GenerationStatistics } from '../../components/generation-statistics';
import { useGenerationStatisticsStore } from '../../stores';

export function StatisticsPage() {
  const statistics = useGenerationStatisticsStore(state => state.statistics);
  const totalDurationMs = useGenerationStatisticsStore(state => state.totalDurationMs);

  if (statistics.length === 0) {
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

  return <GenerationStatistics statistics={statistics} totalDurationMs={totalDurationMs} />;
}
