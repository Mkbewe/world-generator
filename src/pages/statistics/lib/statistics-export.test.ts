import {
  downloadStatisticsExport,
  statisticsExportFileName,
  type StatisticsSnapshot,
} from './statistics-export';
import type { StageStatistics } from '../../../utils/map-generator';

const STAGE: StageStatistics = {
  stageId: 'world-shape',
  stageName: 'World shape',
  status: 'completed',
  startedAt: 0,
  finishedAt: 10,
  durationMs: 10,
};

const SNAPSHOT: StatisticsSnapshot = {
  world: {
    dimensions: { widthMeters: 3000, heightMeters: 2000, sampleWidth: 300, sampleHeight: 200 },
    seed: 123456,
    shape: 'disc',
  },
  generation: { statistics: [STAGE], totalDurationMs: 40 },
  rendering: null,
};

describe('statisticsExportFileName', () => {
  it('names the file after the seed', () => {
    expect(statisticsExportFileName(SNAPSHOT.world)).toBe('world-statistics-123456.json');
  });
});

describe('downloadStatisticsExport', () => {
  it('downloads the snapshot as a JSON file and releases the url', async () => {
    const createObjectURL = vi.fn((_blob: Blob) => 'blob:statistics');
    const revokeObjectURL = vi.fn();
    URL.createObjectURL = createObjectURL;
    URL.revokeObjectURL = revokeObjectURL;
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    downloadStatisticsExport(SNAPSHOT, 'world-statistics-123456.json');

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(click).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:statistics');

    const blob = createObjectURL.mock.calls[0][0];
    expect(blob).toBeInstanceOf(Blob);
    await expect(blob.text()).resolves.toBe(JSON.stringify(SNAPSHOT, null, 2));
  });
});
