import { analyzeLand, type LandAnalysis } from './land-components';
import type { WorldShape } from '../../world-shape';
import { createMapGenerator } from '../pipeline/pipeline-factory';
import { createGeographyPreset, type GeographyPresetId } from '../stages/geology';
import type { MapConfig, MapState } from '../types';

/**
 * GEO-07 acceptance harness. Run manually with:
 *   VITE_GEOLOGY_ACCEPTANCE=1 pnpm exec vitest run src/utils/map-generator/analysis/acceptance.test.ts
 * The default suite skips it, because the matrix takes minutes; the run prints
 * the measured metrics as JSON to the console.
 */
const RUN = import.meta.env.VITE_GEOLOGY_ACCEPTANCE === '1';
/** Measure-only mode prints the numbers without asserting the frozen thresholds. */
const MEASURE = import.meta.env.VITE_GEOLOGY_ACCEPTANCE_MEASURE === '1';
const SIZES = (import.meta.env.VITE_GEOLOGY_ACCEPTANCE_SIZES ?? '2000,4000,8000')
  .split(',')
  .map(Number);
const SEEDS = [17, 42, 123, 777, 2026];
const SHAPES: readonly WorldShape[] = ['disc', 'rectangle'];
const PRESETS: readonly GeographyPresetId[] = [
  'random',
  'archipelago',
  'volcanic-islands',
  'lagoons-atolls',
];
const REFERENCE_METERS_PER_SAMPLE = 4;
const COARSE_METERS_PER_SAMPLE = 8;
const NOISE = { frequency: 4, octaves: 4, persistence: 0.5, lacunarity: 2 } as const;

/** Frozen geometric thresholds, from docs/geology-acceptance-criteria-2026-09-28.md. */
const MIN_ISLET_AREA_M2 = 625;
const MIN_ISLET_WIDTH_M = 20;
const MAX_MICRO_ISLET_CELLS = 9;
/** Provisional statistical thresholds, frozen after the first measurement. */
const MIN_RESOLUTION_AGREEMENT = 0.9;
const MAX_EMPTY_COMBINATIONS = 1;
const MIN_PRESET_PAIR_DIFFERENCES = 3;
const PRESET_DIFFERENCE_SHARE = 0.25;

interface RunMetrics {
  readonly preset: GeographyPresetId;
  readonly seed: number;
  readonly shape: WorldShape;
  readonly sizeMeters: number;
  readonly landShare: number;
  readonly componentCount: number;
  readonly maxComponentAreaM2: number;
  readonly medianComponentAreaM2: number;
  readonly smallestComponentAreaM2: number;
  readonly maxHeight: number;
  readonly maxStepMeters: number;
  readonly geologyMs: number;
  readonly heightmapMs: number;
  readonly analysis: LandAnalysis;
}

function sizeGrid(sizeMeters: number, metersPerSample: number): MapConfig['world']['dimensions'] {
  const side = Math.round(sizeMeters / metersPerSample);
  return {
    widthMeters: sizeMeters,
    heightMeters: sizeMeters,
    sampleWidth: side,
    sampleHeight: side,
  };
}

async function generate(
  preset: GeographyPresetId,
  seed: number,
  shape: WorldShape,
  sizeMeters: number,
  metersPerSample: number
): Promise<{
  metrics: RunMetrics;
  heightmap: Float32Array;
  dimensions: MapConfig['world']['dimensions'];
}> {
  const dimensions = sizeGrid(sizeMeters, metersPerSample);
  const config: MapConfig = {
    world: { dimensions, seed, shape },
    noise: { ...NOISE },
    geology: createGeographyPreset(preset, seed, dimensions, shape),
  };
  const result = await createMapGenerator().generate(config, {} as MapState);
  const state = result.context.state;
  const analysis = analyzeLand({
    heightmap: state.heightmap ?? new Float32Array(),
    provenanceMap: state.provenanceMap,
    plan: state.geologyPlan ?? { areas: [] },
    dimensions,
    worldMask: state.worldMask ?? new Uint8Array(),
  });
  const areas = analysis.components
    .map(component => component.areaSquareMeters)
    .sort((left, right) => left - right);
  const stageMs = (stageId: string): number =>
    result.statistics.find(statistic => statistic.stageId === stageId)?.durationMs ?? 0;
  return {
    metrics: {
      preset,
      seed,
      shape,
      sizeMeters,
      landShare: analysis.landShare,
      componentCount: analysis.components.length,
      maxComponentAreaM2: areas.at(-1) ?? 0,
      medianComponentAreaM2: areas.length === 0 ? 0 : areas[Math.floor(areas.length / 2)],
      smallestComponentAreaM2: areas[0] ?? 0,
      maxHeight: analysis.maxHeight,
      maxStepMeters: analysis.maxStepMeters,
      geologyMs: stageMs('geology'),
      heightmapMs: stageMs('heightmap'),
      analysis,
    },
    heightmap: state.heightmap ?? new Float32Array(),
    dimensions,
  };
}

function median(values: readonly number[]): number {
  if (values.length === 0) {
    return 0;
  }
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.floor(sorted.length / 2)];
}

/** Share of coarse cells that agree with the fine grid on land vs water. */
function resolutionAgreement(
  coarse: LandAnalysis,
  fine: LandAnalysis,
  coarseSide: number,
  fineSide: number
): number {
  const largeFine = new Set(
    fine.components
      .filter(component => component.areaSquareMeters >= MIN_ISLET_AREA_M2)
      .map(component => component.id)
  );
  let compared = 0;
  let agreed = 0;
  for (let y = 0; y < coarseSide; y++) {
    for (let x = 0; x < coarseSide; x++) {
      const fineX = Math.round((x / Math.max(1, coarseSide - 1)) * (fineSide - 1));
      const fineY = Math.round((y / Math.max(1, coarseSide - 1)) * (fineSide - 1));
      const fineIndex = fineY * fineSide + fineX;
      if (!largeFine.has(fine.componentByIndex[fineIndex])) {
        continue;
      }
      compared++;
      const coarseIndex = y * coarseSide + x;
      const coarseLand = coarse.componentByIndex[coarseIndex] >= 0;
      if (coarseLand) {
        agreed++;
      }
    }
  }
  return compared === 0 ? 1 : agreed / compared;
}

describe.runIf(RUN)('GEO-07 acceptance', () => {
  it('holds the acceptance criteria on the fixed matrix', async () => {
    const runs: RunMetrics[] = [];
    const emptyCombinations = new Set<string>();
    const perPresetMaxArea = new Map<GeographyPresetId, number[]>();
    const perPresetMaxHeight = new Map<GeographyPresetId, number[]>();
    let tripleUplift = false;

    for (const sizeMeters of SIZES) {
      for (const shape of SHAPES) {
        for (const preset of PRESETS) {
          let landRuns = 0;
          for (const seed of SEEDS) {
            const { metrics } = await generate(
              preset,
              seed,
              shape,
              sizeMeters,
              REFERENCE_METERS_PER_SAMPLE
            );
            runs.push(metrics);
            const list = perPresetMaxArea.get(preset) ?? [];
            list.push(metrics.maxComponentAreaM2);
            perPresetMaxArea.set(preset, list);
            const heights = perPresetMaxHeight.get(preset) ?? [];
            heights.push(metrics.maxHeight);
            perPresetMaxHeight.set(preset, heights);
            if (metrics.landShare > 0) {
              landRuns++;
            }
            if ([...metrics.analysis.byArea.values()].some(summary => summary.components >= 3)) {
              tripleUplift = true;
            }
          }
          if (landRuns === 0) {
            emptyCombinations.add(`${preset}:${sizeMeters}:${shape}`);
          }
        }
      }
    }

    for (const metrics of runs) {
      for (const component of metrics.analysis.components) {
        if (MEASURE) {
          continue;
        }
        if (component.cells < MAX_MICRO_ISLET_CELLS) {
          expect(component.areaSquareMeters).toBeGreaterThanOrEqual(MIN_ISLET_AREA_M2);
        }
        if (component.areaSquareMeters >= MIN_ISLET_AREA_M2) {
          expect(component.widthMeters).toBeGreaterThanOrEqual(MIN_ISLET_WIDTH_M);
        }
      }
      if (!MEASURE) {
        const reliefLimit = Math.max(60, metrics.maxHeight * 0.5);
        expect(metrics.maxStepMeters).toBeLessThanOrEqual(reliefLimit);
        expect(metrics.geologyMs + metrics.heightmapMs).toBeLessThanOrEqual(
          metrics.sizeMeters >= 8000 ? 20_000 : 5000
        );
      }
    }

    const areasByPreset = [...perPresetMaxArea.values()].map(median);
    const heightsByPreset = [...perPresetMaxHeight.values()].map(median);
    const differences = new Set<number>();
    for (let left = 0; left < PRESETS.length; left++) {
      for (let right = left + 1; right < PRESETS.length; right++) {
        const areaDiff = relativeDifference(areasByPreset[left], areasByPreset[right]);
        const heightDiff = relativeDifference(heightsByPreset[left], heightsByPreset[right]);
        if (areaDiff >= PRESET_DIFFERENCE_SHARE || heightDiff >= PRESET_DIFFERENCE_SHARE) {
          differences.add(left * PRESETS.length + right);
        }
      }
    }
    let agreement = 1;
    if (SIZES.includes(4000)) {
      const fine = await generate('random', 17, 'disc', 4000, REFERENCE_METERS_PER_SAMPLE);
      const coarse = await generate('random', 17, 'disc', 4000, COARSE_METERS_PER_SAMPLE);
      agreement = resolutionAgreement(
        coarse.metrics.analysis,
        fine.metrics.analysis,
        coarse.dimensions.sampleWidth,
        fine.dimensions.sampleWidth
      );
    }

    console.warn('GEO-07 summary:', {
      emptyCombinations: emptyCombinations.size,
      tripleUplift,
      presetPairDifferences: differences.size,
      resolutionAgreement: agreement,
    });
    if (!MEASURE) {
      expect(emptyCombinations.size).toBeLessThanOrEqual(MAX_EMPTY_COMBINATIONS);
      expect(tripleUplift).toBe(true);
      expect(differences.size).toBeGreaterThanOrEqual(MIN_PRESET_PAIR_DIFFERENCES);
      expect(agreement).toBeGreaterThanOrEqual(MIN_RESOLUTION_AGREEMENT);
    }

    console.warn(
      `GEO-07 metrics (${runs.length} runs): ` +
        JSON.stringify(
          runs.map(({ analysis, ...metrics }) => ({
            ...metrics,
            components: analysis.components.length,
            microIslets: analysis.components.filter(component => component.cells < 9).length,
          }))
        )
    );
  }, 1_800_000);
});

function relativeDifference(left: number, right: number): number {
  const largest = Math.max(Math.abs(left), Math.abs(right), 1e-9);
  return Math.abs(left - right) / largest;
}
