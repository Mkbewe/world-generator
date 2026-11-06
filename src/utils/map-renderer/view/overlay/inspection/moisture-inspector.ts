import type { OverlayInspectionInput, OverlayInspector } from './overlay-inspector';
import { cellIndexAt, isInsideWorld } from './world-cell';
import { formatPercent } from '../../../../format';
import type { MapOverlayInspection } from '../../../types';

/** Reads the base moisture under one world cell. */
export class MoistureOverlayInspector implements OverlayInspector {
  readonly overlayId = 'moisture' as const;

  inspect({ x, y, mapSize, data }: OverlayInspectionInput): MapOverlayInspection | undefined {
    const index = cellIndexAt(mapSize, x, y);
    if (index === undefined || !isInsideWorld(data.worldMask, index)) {
      return undefined;
    }
    const map = data.moistureBaseMap;
    if (!(map instanceof Float32Array)) {
      return undefined;
    }
    const value = map[index];
    if (value === undefined || !Number.isFinite(value)) {
      return undefined;
    }
    return {
      overlayId: 'moisture',
      label: 'Moisture',
      value: formatPercent(value),
    };
  }
}
