import type { MapInfo, MapInspection, MapSize } from '../../utils/map-renderer';

export interface PointerSample {
  /** Source raster cell under the pointer. */
  readonly x: number;
  readonly y: number;
  /** Normalized position within the source map, in the 0..1 range. */
  readonly u: number;
  readonly v: number;
}

interface ClientRect {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

/** Maps a client point onto the source raster, independent of CSS scaling and DPR. */
export function samplePointer(
  rect: ClientRect,
  size: MapSize,
  clientX: number,
  clientY: number
): PointerSample | undefined {
  if (rect.width <= 0 || rect.height <= 0) {
    return undefined;
  }
  const u = clamp01((clientX - rect.left) / rect.width);
  const v = clamp01((clientY - rect.top) / rect.height);

  return {
    x: Math.min(size.width - 1, Math.floor(u * size.width)),
    y: Math.min(size.height - 1, Math.floor(v * size.height)),
    u,
    v,
  };
}

export interface InspectorReadout {
  readonly position: PointerSample;
  readonly inspection?: MapInspection;
}

export interface ReadoutItem {
  readonly id: string;
  readonly label: string;
  readonly value: string;
}

const EMPTY = '—';

export function readoutItems(
  readout: InspectorReadout | undefined,
  info: MapInfo = {}
): readonly ReadoutItem[] {
  return [
    {
      id: 'position',
      label: 'Position',
      value: readout ? `X ${readout.position.x}, Y ${readout.position.y}` : EMPTY,
    },
    {
      id: 'value',
      label: readout?.inspection?.label ?? 'Value',
      value: describeValue(readout?.inspection, info),
    },
  ];
}

function describeValue(inspection: MapInspection | undefined, info: MapInfo): string {
  if (!inspection || inspection.value === undefined) {
    return EMPTY;
  }
  switch (inspection.id) {
    case 'world-shape':
      return inspection.value === 1 ? 'Inside' : 'Outside';
    case 'macro-region': {
      const label = macroRegionLabel(info, inspection.value);
      return label ?? `Region ${inspection.value}`;
    }
    default:
      return inspection.value.toFixed(3);
  }
}

/** Reads the label captured with the generated map for the given region index. */
function macroRegionLabel(info: MapInfo, value: number): string | undefined {
  const labels = info.macroRegionLabels;
  if (!Array.isArray(labels)) {
    return undefined;
  }
  const label: unknown = labels[value];
  return typeof label === 'string' && label.trim().length > 0 ? label : undefined;
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}
