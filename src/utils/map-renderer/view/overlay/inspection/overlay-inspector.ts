import type { MapSize } from '@renderer/layer';
import type { MapInfo, MapOverlayId, MapOverlayInspection } from '@renderer/types';
import type { LayerDataRecord } from '@layers';

/** Data every overlay inspector receives for one source cell. */
export interface OverlayInspectionInput {
  readonly x: number;
  readonly y: number;
  readonly mapSize?: MapSize;
  readonly data: LayerDataRecord;
  readonly info: MapInfo;
}

/** One overlay owns its visibility-independent readout. */
export interface OverlayInspector {
  readonly overlayId: MapOverlayId;
  inspect(input: OverlayInspectionInput): MapOverlayInspection | undefined;
}

/** Resolves every visible overlay that can describe the cell. */
export class OverlayInspectorRegistry {
  constructor(private readonly inspectors: readonly OverlayInspector[]) {}

  inspectAll(
    input: OverlayInspectionInput,
    isVisible: (id: MapOverlayId) => boolean
  ): readonly MapOverlayInspection[] {
    const inspections: MapOverlayInspection[] = [];
    for (const inspector of this.inspectors) {
      if (!isVisible(inspector.overlayId)) {
        continue;
      }
      const inspection = inspector.inspect(input);
      if (inspection) {
        inspections.push(inspection);
      }
    }
    return inspections;
  }
}
