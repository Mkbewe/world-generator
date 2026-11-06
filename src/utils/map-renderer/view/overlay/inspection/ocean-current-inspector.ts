import type { OverlayInspectionInput, OverlayInspector } from './overlay-inspector';
import { describeOceanCurrent } from '../../../ocean-current';
import type { MapOverlayInspection } from '../../../types';

/** Reads the BaseClimate current under one world cell. */
export class OceanCurrentOverlayInspector implements OverlayInspector {
  readonly overlayId = 'ocean-currents' as const;

  inspect({ x, y, mapSize, data }: OverlayInspectionInput): MapOverlayInspection | undefined {
    if (!mapSize || x < 0 || y < 0 || x >= mapSize.width || y >= mapSize.height) {
      return undefined;
    }
    const index = y * mapSize.width + x;
    if (!isInsideWorld(data.worldMask, index)) {
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
    return {
      overlayId: 'ocean-currents',
      label: 'Ocean current',
      value: describeOceanCurrent(angle, strength),
    };
  }
}

function isInsideWorld(value: unknown, index: number): boolean {
  return value instanceof Uint8Array && value[index] === 1;
}
