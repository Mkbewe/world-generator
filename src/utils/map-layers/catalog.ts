import type { LayerSpec } from './layer-spec';
import { REGION_COLORS } from './palettes';
import type { LayerDataRecord, MapRasters } from './types';

/** Ordered catalog of raster layers currently available in the product. */
export const LAYER_CATALOG = [
  {
    id: 'world-shape',
    label: 'World shape',
    source: 'worldMask',
    dataType: 'uint8',
    providesMask: { insideValue: 1 },
    palette: { kind: 'solid', color: [16, 42, 67] },
  },
  {
    id: 'macro-region',
    label: 'Macro regions',
    source: 'macroRegionIdMap',
    dataType: 'uint8',
    clipTo: 'world-shape',
    palette: { kind: 'discrete', colors: REGION_COLORS, overflow: 'cycle' },
  },
  {
    id: 'noise',
    label: 'Noise',
    source: 'noiseMap',
    dataType: 'float32',
    clipTo: 'world-shape',
    palette: {
      kind: 'ramp',
      stops: [
        { at: 0, color: [0, 0, 0] },
        { at: 1, color: [255, 255, 255] },
      ],
    },
  },
] as const satisfies readonly LayerSpec[];

/** Selects only catalog-owned raster sources at the dynamic data boundary. */
export function selectRasters(data: LayerDataRecord): MapRasters {
  const selected: Record<string, unknown> = {};
  for (const spec of LAYER_CATALOG) {
    if (Object.hasOwn(data, spec.source) && data[spec.source] !== undefined) {
      selected[spec.source] = data[spec.source];
    }
  }
  return selected as MapRasters;
}
