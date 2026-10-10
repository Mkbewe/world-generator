import type { RefObject } from 'react';

import { metersPerCssPixel, scaleBarSegment } from './lib/scale-bar';
import { useElementSize } from '../../hooks/use-element-size';
import type { WorldDimensions } from '../../utils/world-dimensions';
import styles from './scale-bar.module.scss';

export interface ScaleBarProps {
  /** The map area the bar measures itself against. */
  containerRef: RefObject<HTMLElement | null>;
  /** Current zoom relative to the fitted view. */
  zoom: number;
  dimensions: WorldDimensions;
}

/** Round-distance scale bar drawn over the preview corner. */
export function ScaleBar({ containerRef, zoom, dimensions }: ScaleBarProps) {
  const { width, height } = useElementSize(containerRef);
  const metersPerPixel = metersPerCssPixel(zoom, dimensions, width, height);
  const segment = metersPerPixel === undefined ? undefined : scaleBarSegment(metersPerPixel);
  if (!segment) {
    return null;
  }
  return (
    <div className={styles.bar} role='img' aria-label={`Scale: ${segment.label}`}>
      <span className={styles.label}>{segment.label}</span>
      <span className={styles.line} style={{ width: `${segment.pixels}px` }} />
    </div>
  );
}
