import { PRESENTATION_MARGIN, project, type ViewTransform } from '@renderer';
import type { PointerSample } from '@readout';

import type { WorldDimensions } from '../../../../../utils/world-dimensions';

export interface PinMarkerPoint {
  readonly x: number;
  readonly y: number;
}

export interface PinMarkerInput {
  readonly position?: PointerSample;
  readonly viewTransform: ViewTransform;
  readonly dimensions?: WorldDimensions;
  readonly containerWidth: number;
  readonly containerHeight: number;
}

/** Screen position of the pinned sample, in the same frame as the measurement overlay. */
export function pinMarkerPoint({
  position,
  viewTransform,
  dimensions,
  containerWidth,
  containerHeight,
}: PinMarkerInput): PinMarkerPoint | undefined {
  if (
    !position ||
    !dimensions ||
    containerWidth <= 0 ||
    containerHeight <= 0 ||
    viewTransform.scale <= 0 ||
    !Number.isFinite(viewTransform.scale)
  ) {
    return undefined;
  }

  const padding = Math.min(PRESENTATION_MARGIN, containerWidth * 0.1, containerHeight * 0.1);
  const projection = project(
    viewTransform,
    { width: containerWidth, height: containerHeight },
    { width: dimensions.sampleWidth, height: dimensions.sampleHeight },
    padding
  );
  if (projection.cellSize <= 0) {
    return undefined;
  }

  return {
    x: projection.left + position.u * projection.width,
    y: projection.top + position.v * projection.height,
  };
}
