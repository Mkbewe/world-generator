import { buildMapStatisticsModel } from './map-statistics-model';
import type { WorldConfig } from '../../../utils/map-generator';

const WORLD_CONFIG: WorldConfig = {
  seed: 42,
  shape: 'disc',
  dimensions: {
    widthMeters: 10_000,
    heightMeters: 5_000,
    sampleWidth: 100,
    sampleHeight: 50,
  },
};

describe('map-statistics-model', () => {
  it('builds view model with formatted metrics from world config', () => {
    const model = buildMapStatisticsModel(WORLD_CONFIG, 1250);

    expect(model.titleKey).toBe('statistics.map.title');
    expect(model.summary).toEqual([
      {
        key: 'seed',
        labelKey: 'statistics.map.seed',
        value: '42',
        descriptionKey: 'statistics.map.seedDescription',
      },
      {
        key: 'size',
        labelKey: 'statistics.map.size',
        value: '10,000 × 5,000 m',
        descriptionKey: 'statistics.map.sizeDescription',
      },
      {
        key: 'terrainDetail',
        labelKey: 'statistics.map.terrainDetail',
        value: '100 m',
        descriptionKey: 'statistics.map.terrainDetailDescription',
      },
      {
        key: 'area',
        labelKey: 'statistics.map.area',
        value: '50 km²',
        descriptionKey: 'statistics.map.areaDescription',
      },
      {
        key: 'shape',
        labelKey: 'statistics.map.shape',
        value: 'disc',
        descriptionKey: 'statistics.map.shapeDescription',
      },
      {
        key: 'cells',
        labelKey: 'statistics.map.cells',
        value: '5,000',
        descriptionKey: 'statistics.map.cellsDescription',
      },
      {
        key: 'totalTime',
        labelKey: 'statistics.map.totalTime',
        value: '1.25 s',
        descriptionKey: 'statistics.map.totalTimeDescription',
      },
    ]);
  });
});
