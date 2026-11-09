import type { MapOverlayInspection } from '@renderer/types';

import type { OverlayInspectionInput, OverlayInspector } from './overlay-inspector';
import { cellIndexAt, isInsideWorld } from './world-cell';

/** Reads the BaseClimate current under one world cell. */
export class OceanCurrentOverlayInspector implements OverlayInspector {
  readonly overlayId = 'ocean-currents' as const;

  inspect({ x, y, mapSize, data }: OverlayInspectionInput): MapOverlayInspection | undefined {
    const index = cellIndexAt(mapSize, x, y);
    if (index === undefined || !isInsideWorld(data.worldMask, index)) {
      return undefined;
    }
    const angles = data.oceanCurrentMap;
    const strengths = data.oceanCurrentStrength;
    if (!(angles instanceof Float32Array) || !(strengths instanceof Float32Array)) {
      return undefined;
    }
    const angle = angles[index];
    const strength = strengths[index];
    if (!Number.isFinite(angle) || !Number.isFinite(strength)) {
      return undefined;
    }
    return { overlayId: 'ocean-currents', oceanCurrent: { angle, strength } };
  }
}
