import { renderHook } from '@testing-library/react';

import { useStatisticsSnapshot } from './use-statistics-snapshot';
import {
  useGenerationStatisticsStore,
  useMapConfigStore,
  useRenderStatisticsStore,
} from '../../../stores';
import type { StageStatistics } from '../../../utils/map-generator';
import type { RenderStatistics } from '../../../utils/map-renderer';

const WORLD = {
  dimensions: { widthMeters: 3000, heightMeters: 2000, sampleWidth: 300, sampleHeight: 200 },
  seed: 123456,
  shape: 'disc' as const,
};

const STAGE: StageStatistics = {
  stageId: 'world-shape',
  stageName: 'World shape',
  status: 'completed',
  startedAt: 0,
  finishedAt: 10,
  durationMs: 10,
};

const RENDERING: RenderStatistics = {
  elapsedDurationMs: 100,
  overlayDurationMs: 1,
  presentationDurationMs: 2,
  bufferBytes: 3,
  layers: [],
};

describe('useStatisticsSnapshot', () => {
  beforeEach(() => {
    useGenerationStatisticsStore.setState({ result: undefined });
    useMapConfigStore.setState({ config: undefined });
    useRenderStatisticsStore.setState({ statistics: undefined });
  });

  it('returns nothing without a generated map', () => {
    const { result } = renderHook(() => useStatisticsSnapshot());

    expect(result.current).toBeUndefined();
  });

  it('collects the whole world, generation and rendering data', () => {
    const generation = { statistics: [STAGE], totalDurationMs: 40 };
    useMapConfigStore.setState({ config: { world: WORLD } });
    useGenerationStatisticsStore.setState({ result: generation });
    useRenderStatisticsStore.setState({ statistics: RENDERING });

    const { result } = renderHook(() => useStatisticsSnapshot());

    expect(result.current).toEqual({ world: WORLD, generation, rendering: RENDERING });
  });

  it('keeps rendering empty without render statistics', () => {
    useMapConfigStore.setState({ config: { world: WORLD } });
    useGenerationStatisticsStore.setState({ result: { statistics: [], totalDurationMs: 0 } });

    const { result } = renderHook(() => useStatisticsSnapshot());

    expect(result.current?.rendering).toBeNull();
  });
});
