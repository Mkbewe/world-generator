import { buildGenerationStatisticsModel } from './generation-statistics-model';
import type { GenerationStatistics } from '../../../stores';
import type { StageStatistics } from '../../../utils/map-generator';

function createStage(overrides: Partial<StageStatistics> = {}): StageStatistics {
  return {
    stageId: 'world-shape',
    stageNameKey: 'stages.worldShape',
    status: 'completed',
    startedAt: 0,
    finishedAt: 12.5,
    durationMs: 12.5,
    ...overrides,
  };
}

describe('generation-statistics-model', () => {
  describe('buildGenerationStatisticsModel', () => {
    it('constructs summary, timing, and sections with message keys from stage statistics', () => {
      const stats: GenerationStatistics = {
        totalDurationMs: 1500,
        statistics: [
          createStage({
            stageId: 'world-shape',
            stageNameKey: 'stages.worldShape',
            durationMs: 500,
            details: { bytes: 2048, coverage: 0.75 },
          }),
          createStage({
            stageId: 'macro-region',
            stageNameKey: 'stages.macroRegion',
            status: 'skipped',
            durationMs: 700,
            details: { regions: 4, bytes: 4096 },
          }),
        ],
      };

      const model = buildGenerationStatisticsModel(stats);

      expect(model.titleKey).toBe('statistics.generation.title');
      expect(model.summary).toEqual([
        {
          key: 'totalTime',
          labelKey: 'statistics.generation.totalTime',
          value: '1.50 s',
          descriptionKey: 'statistics.generation.totalTimeDescription',
        },
        {
          key: 'totalData',
          labelKey: 'statistics.generation.totalData',
          value: '6.1 KB',
          descriptionKey: 'statistics.generation.totalDataDescription',
        },
      ]);
      expect(model.timing).toEqual([
        {
          key: 'world-shape',
          nameKey: 'stages.worldShape',
          durationMs: 500,
        },
        {
          key: 'macro-region',
          nameKey: 'stages.macroRegion',
          durationMs: 700,
        },
        {
          key: 'overhead',
          nameKey: 'statistics.generation.overhead',
          durationMs: 300,
          muted: true,
        },
      ]);
      expect(model.sections).toHaveLength(2);
      expect(model.sections?.[0]).toEqual({
        key: 'world-shape',
        titleKey: 'stages.worldShape',
        durationMs: 500,
        reused: false,
        metrics: [
          {
            key: 'bytes',
            labelKey: 'statistics.metrics.bytes',
            descriptionKey: 'statistics.metrics.bytesDescription',
            value: '2.0 KB',
          },
          {
            key: 'coverage',
            labelKey: 'statistics.metrics.coverage',
            descriptionKey: 'statistics.metrics.coverageDescription',
            value: '75.0%',
          },
        ],
      });
      expect(model.sections?.[1]?.durationMs).toBe(700);
      expect(model.sections?.[1]?.reused).toBe(true);
    });

    it('omits overhead timing segment when stages account for all duration', () => {
      const stats: GenerationStatistics = {
        totalDurationMs: 100,
        statistics: [createStage({ durationMs: 150 })],
      };

      const model = buildGenerationStatisticsModel(stats);

      expect(model.timing).toBeDefined();
      expect(model.timing?.[0]?.key).toBe('world-shape');
      expect(model.timing).toHaveLength(1);
    });

    it('localizes and formats base-climate metrics', () => {
      const statistics: GenerationStatistics = {
        totalDurationMs: 10,
        statistics: [
          createStage({
            stageId: 'base-climate',
            details: {
              zones: 3,
              coveredCells: 1_764_688,
              coldShare: 0.52,
              temperateShare: 0.155,
              warmShare: 0.325,
              moistureMin: 0.096,
              moistureMax: 0.866,
              moistureMean: 0.507,
              moistureStdDev: 0.135,
            },
          }),
        ],
      };

      const metrics = buildGenerationStatisticsModel(statistics).sections?.[0]?.metrics;

      expect(metrics).toEqual([
        {
          key: 'zones',
          labelKey: 'statistics.metrics.zones',
          descriptionKey: 'statistics.metrics.zonesDescription',
          value: '3',
        },
        {
          key: 'coveredCells',
          labelKey: 'statistics.metrics.coveredCells',
          descriptionKey: 'statistics.metrics.coveredCellsDescription',
          value: '1,764,688',
        },
        {
          key: 'coldShare',
          labelKey: 'statistics.metrics.coldShare',
          descriptionKey: 'statistics.metrics.coldShareDescription',
          value: '52.0%',
        },
        {
          key: 'temperateShare',
          labelKey: 'statistics.metrics.temperateShare',
          descriptionKey: 'statistics.metrics.temperateShareDescription',
          value: '15.5%',
        },
        {
          key: 'warmShare',
          labelKey: 'statistics.metrics.warmShare',
          descriptionKey: 'statistics.metrics.warmShareDescription',
          value: '32.5%',
        },
        {
          key: 'moistureMin',
          labelKey: 'statistics.metrics.moistureMin',
          descriptionKey: 'statistics.metrics.moistureMinDescription',
          value: '0.096',
        },
        {
          key: 'moistureMax',
          labelKey: 'statistics.metrics.moistureMax',
          descriptionKey: 'statistics.metrics.moistureMaxDescription',
          value: '0.866',
        },
        {
          key: 'moistureMean',
          labelKey: 'statistics.metrics.moistureMean',
          descriptionKey: 'statistics.metrics.moistureMeanDescription',
          value: '0.507',
        },
        {
          key: 'moistureStdDev',
          labelKey: 'statistics.metrics.moistureStdDev',
          descriptionKey: 'statistics.metrics.moistureStdDevDescription',
          value: '0.135',
        },
      ]);
    });

    it('throws when a stage reports a metric without a descriptor', () => {
      const statistics: GenerationStatistics = {
        totalDurationMs: 10,
        statistics: [createStage({ details: { futureMetric: 7 } })],
      };

      expect(() => buildGenerationStatisticsModel(statistics)).toThrow(
        'Missing metric descriptor for generation statistic "futureMetric".'
      );
    });
  });
});
