import type { LayerDataRecord } from '@layers';

import type { WorldShape } from '../../../world-shape';
import type { MapInfo, MapOverlayId, SpatialMask } from '../../types';
import type { ViewportSize } from '../../viewport';
import type { ViewTransform } from '../view-transform';

/** Everything an overlay needs to paint one frame. */
export interface OverlayFrame {
  readonly canvas: HTMLCanvasElement;
  readonly world: SpatialMask;
  readonly shape: WorldShape;
  readonly viewport: ViewportSize;
  readonly view: ViewTransform;
  readonly data: LayerDataRecord;
  readonly info: MapInfo;
}

/** One independently switchable overlay renderer. */
export interface OverlayRenderer {
  readonly id: MapOverlayId;
  isAvailable(frame: OverlayFrame): boolean;
  render(frame: OverlayFrame): void;
}
