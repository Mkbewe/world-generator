import type { RefObject } from 'react';
import type { Measurement } from '@readout';
import type { ViewTransform } from '@renderer';

import { calculateMeasurementGeometry } from './lib/measure-geometry';
import { useElementSize } from '../../../../hooks/use-element-size';
import type { WorldDimensions } from '../../../../utils/world-dimensions';
import styles from './map-measure.module.scss';

export interface MapMeasureProps {
  /** The map area the measured path is drawn over. */
  containerRef: RefObject<HTMLElement | null>;
  /** Current placement of the map in the preview. */
  viewTransform: ViewTransform;
  dimensions: WorldDimensions;
  measurement?: Measurement;
}

/** Committed points with the live preview, as ruler segments, markers and labels. */
export function MapMeasure({
  containerRef,
  viewTransform,
  dimensions,
  measurement,
}: MapMeasureProps) {
  const { width, height } = useElementSize(containerRef);
  const geometry = calculateMeasurementGeometry({
    measurement,
    viewTransform,
    dimensions,
    containerWidth: width,
    containerHeight: height,
  });

  if (!geometry) {
    return null;
  }

  return (
    <svg className={styles.overlay} aria-hidden='true'>
      {geometry.segments.map((segment, index) => (
        <g key={`segment-${index}`}>
          <line
            className={segment.preview ? styles.preview : styles.line}
            x1={segment.start.x}
            y1={segment.start.y}
            x2={segment.end.x}
            y2={segment.end.y}
          />
          {segment.ticks.map(tick => (
            <line
              key={`${tick.x1}:${tick.y1}`}
              className={styles.tick}
              x1={tick.x1}
              y1={tick.y1}
              x2={tick.x2}
              y2={tick.y2}
            />
          ))}
        </g>
      ))}
      {geometry.segments.map((segment, index) => (
        <text
          key={`segment-label-${index}`}
          className={styles.label}
          x={segment.label.x}
          y={segment.label.y}
          textAnchor='middle'
          dominantBaseline='central'
        >
          {segment.label.text}
        </text>
      ))}
      {geometry.points.map((point, index) => (
        <circle key={`point-${index}`} className={styles.marker} cx={point.x} cy={point.y} r={4} />
      ))}
      {geometry.previewPoint && (
        <circle
          className={styles.previewMarker}
          cx={geometry.previewPoint.x}
          cy={geometry.previewPoint.y}
          r={3}
        />
      )}
      <text
        className={styles.label}
        x={geometry.startLabel.x}
        y={geometry.startLabel.y}
        textAnchor='middle'
        dominantBaseline='central'
      >
        {geometry.startLabel.text}
      </text>
      {geometry.totalLabel && (
        <text
          className={styles.label}
          x={geometry.totalLabel.x}
          y={geometry.totalLabel.y}
          textAnchor='middle'
          dominantBaseline='central'
        >
          {geometry.totalLabel.text}
        </text>
      )}
    </svg>
  );
}
