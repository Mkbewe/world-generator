import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { Button, Card, Flex, Heading, Text } from '@radix-ui/themes';

import { useStatisticsSnapshot } from './hooks/use-statistics-snapshot';
import { downloadStatisticsExport, statisticsExportFileName } from './lib/statistics-export';
import { ExportDialog } from '../../components/export-dialog';
import {
  buildGenerationStatisticsModel,
  buildMapStatisticsModel,
  buildRenderStatisticsModel,
  StatisticsPanel,
} from '../../components/statistics-panel';

export function StatisticsPage() {
  const snapshot = useStatisticsSnapshot();
  const [isExportOpen, setIsExportOpen] = useState(false);
  const { t } = useTranslation();

  if (!snapshot || snapshot.generation.statistics.length === 0) {
    return (
      <Card size={{ initial: '2', sm: '3' }}>
        <Flex direction='column' align='center' gap='4'>
          <Heading size='5' color='violet'>
            {t('statisticsPage.emptyTitle')}
          </Heading>
          <Text size='3' color='gray' align='center'>
            {t('statisticsPage.emptyDescription')}
          </Text>
          <Button asChild>
            <Link to='/'>{t('statisticsPage.back')}</Link>
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

  const totalDurationMs =
    snapshot.rendering?.elapsedDurationMs ?? snapshot.generation.totalDurationMs;

  const mapModel = buildMapStatisticsModel(snapshot.world, totalDurationMs);
  const generationModel = buildGenerationStatisticsModel(snapshot.generation);
  const renderModel = buildRenderStatisticsModel(snapshot.rendering);

  return (
    <Flex direction='column' gap='5'>
      <Flex justify='end'>
        <Button onClick={() => setIsExportOpen(true)}>{t('statisticsPage.export')}</Button>
      </Flex>
      <StatisticsPanel model={mapModel} />
      <StatisticsPanel model={generationModel} />
      {renderModel && <StatisticsPanel model={renderModel} />}
      <ExportDialog
        isOpen={isExportOpen}
        onOpenChange={setIsExportOpen}
        title={t('statisticsPage.exportTitle')}
        description={t('statisticsPage.exportDescription')}
        formats={[{ id: 'json', label: t('statisticsPage.exportJson') }]}
        onExport={handleExport}
      />
    </Flex>
  );
}
