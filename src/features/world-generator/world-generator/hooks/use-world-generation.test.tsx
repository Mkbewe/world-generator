import type { MapConfig, PipelineWorkerGenerationResult } from '@generator';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  BASE_CLIMATE_FORM_DEFAULTS,
  GENERAL_FORM_DEFAULTS,
  type GenerationProgressState,
  GEOLOGY_FORM_DEFAULTS,
  HEIGHTMAP_FORM_DEFAULTS,
  MACRO_REGION_FORM_DEFAULTS,
  useBaseClimateFormStore,
  useGeneralFormStore,
  useGenerationProgressStore,
  useGenerationStatisticsStore,
  useGeologyFormStore,
  useHeightmapFormStore,
  useMacroRegionFormStore,
  useMapConfigStore,
  useWorldShapeFormStore,
  WORLD_SHAPE_FORM_DEFAULTS,
} from '../../../../stores';

type Generate = (
  config: MapConfig,
  reportProgress: (progress: GenerationProgressState) => void
) => Promise<PipelineWorkerGenerationResult | undefined>;

const { generateMock } = vi.hoisted(() => ({
  generateMock: vi.fn<Generate>(),
}));

vi.mock('../lib/world-generation-session', () => ({
  worldGenerationSession: { generate: generateMock },
}));

import { useWorldGeneration } from './use-world-generation';

function deferred<T>() {
  let resolve: (value: T) => void = () => {};
  let reject: (reason?: unknown) => void = () => {};
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });
  return { promise, resolve, reject };
}

function runningProgress(startedAt: number): GenerationProgressState {
  return { status: 'running', startedAt, stages: [] };
}

describe('useWorldGeneration', () => {
  beforeEach(() => {
    generateMock.mockReset();
    useGeneralFormStore.setState({ ...GENERAL_FORM_DEFAULTS });
    useWorldShapeFormStore.setState({ ...WORLD_SHAPE_FORM_DEFAULTS });
    useMacroRegionFormStore.setState({ ...MACRO_REGION_FORM_DEFAULTS });
    useBaseClimateFormStore.setState({ ...BASE_CLIMATE_FORM_DEFAULTS });
    useGeologyFormStore.setState({ ...GEOLOGY_FORM_DEFAULTS });
    useHeightmapFormStore.setState({ ...HEIGHTMAP_FORM_DEFAULTS });
    useGenerationProgressStore.getState().setProgress(undefined);
    useGenerationStatisticsStore.getState().setResult(undefined);
    useMapConfigStore.getState().setConfig(undefined);
  });

  it('keeps the active run state when a superseded run settles', async () => {
    const first = deferred<PipelineWorkerGenerationResult | undefined>();
    const second = deferred<PipelineWorkerGenerationResult | undefined>();
    const activeProgress = runningProgress(2);
    let reportFirstProgress: ((progress: GenerationProgressState) => void) | undefined;

    generateMock
      .mockImplementationOnce((_config, reportProgress) => {
        reportFirstProgress = reportProgress;
        return first.promise;
      })
      .mockImplementationOnce((_config, reportProgress) => {
        reportProgress(activeProgress);
        return second.promise;
      });

    const { result } = renderHook(() => useWorldGeneration());
    let firstRun = Promise.resolve();
    act(() => {
      firstRun = result.current.generate();
    });
    let secondRun = Promise.resolve();
    act(() => {
      secondRun = result.current.generate();
    });

    expect(generateMock).toHaveBeenCalledTimes(2);
    expect(result.current.isGenerating).toBe(true);
    expect(useGenerationProgressStore.getState().progress).toEqual(activeProgress);

    act(() => {
      reportFirstProgress?.(runningProgress(1));
    });
    expect(useGenerationProgressStore.getState().progress).toEqual(activeProgress);

    await act(async () => {
      first.resolve(undefined);
      await firstRun;
    });

    expect(result.current.isGenerating).toBe(true);
    expect(useGenerationProgressStore.getState().progress).toEqual(activeProgress);

    await act(async () => {
      second.resolve({ statistics: [], totalDurationMs: 4 });
      await secondRun;
    });

    expect(result.current.isGenerating).toBe(false);
    expect(useGenerationStatisticsStore.getState().result).toEqual({
      statistics: [],
      totalDurationMs: 4,
    });
  });

  it('ignores an error from a superseded run', async () => {
    const first = deferred<PipelineWorkerGenerationResult | undefined>();
    const second = deferred<PipelineWorkerGenerationResult | undefined>();
    const activeProgress = runningProgress(2);

    generateMock
      .mockImplementationOnce(() => first.promise)
      .mockImplementationOnce((_config, reportProgress) => {
        reportProgress(activeProgress);
        return second.promise;
      });

    const { result } = renderHook(() => useWorldGeneration());
    let firstRun = Promise.resolve();
    act(() => {
      firstRun = result.current.generate();
    });
    let secondRun = Promise.resolve();
    act(() => {
      secondRun = result.current.generate();
    });

    await act(async () => {
      first.reject(new Error('Superseded run failed.'));
      await firstRun;
    });

    expect(result.current.error).toBeUndefined();
    expect(result.current.isGenerating).toBe(true);
    expect(useGenerationProgressStore.getState().progress).toEqual(activeProgress);

    await act(async () => {
      second.resolve({ statistics: [], totalDurationMs: 4 });
      await secondRun;
    });
  });

  it('ignores a result from a superseded run', async () => {
    const first = deferred<PipelineWorkerGenerationResult | undefined>();
    const second = deferred<PipelineWorkerGenerationResult | undefined>();

    generateMock
      .mockImplementationOnce(() => first.promise)
      .mockImplementationOnce(() => second.promise);

    const { result } = renderHook(() => useWorldGeneration());
    let firstRun = Promise.resolve();
    act(() => {
      firstRun = result.current.generate();
    });
    let secondRun = Promise.resolve();
    act(() => {
      secondRun = result.current.generate();
    });

    await act(async () => {
      first.resolve({ statistics: [], totalDurationMs: 1 });
      await firstRun;
    });

    expect(useMapConfigStore.getState().config).toBeUndefined();
    expect(useGenerationStatisticsStore.getState().result).toBeUndefined();

    await act(async () => {
      second.resolve({ statistics: [], totalDurationMs: 4 });
      await secondRun;
    });
  });
});
