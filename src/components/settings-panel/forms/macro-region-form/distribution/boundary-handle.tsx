import { useRef } from 'react';

import { MIN_MACRO_REGION_SHARE } from '../../../../../utils/map-generator/stages/macro-region-sizes';
import styles from '../macro-region-form.module.scss';

interface BoundaryHandleProps {
  boundary: number;
  index: number;
  onMove: (index: number, percent: number) => void;
}

export function BoundaryHandle({ boundary, index, onMove }: BoundaryHandleProps) {
  const handleRef = useRef<HTMLButtonElement>(null);

  const moveTo = (clientX: number): void => {
    const track = handleRef.current?.parentElement;
    if (!track) {
      return;
    }
    const rect = track.getBoundingClientRect();
    if (rect.width === 0) {
      return;
    }
    onMove(index, ((clientX - rect.left) / rect.width) * 100);
  };

  return (
    <button
      ref={handleRef}
      type='button'
      role='slider'
      aria-label={`Boundary ${index + 1}`}
      aria-valuemin={MIN_MACRO_REGION_SHARE}
      aria-valuemax={100 - MIN_MACRO_REGION_SHARE}
      aria-valuenow={Math.round(boundary)}
      className={styles.distributionHandle}
      style={{ left: `${boundary}%` }}
      onKeyDown={event => {
        if (event.key === 'ArrowLeft') {
          event.preventDefault();
          onMove(index, boundary - 1);
        }
        if (event.key === 'ArrowRight') {
          event.preventDefault();
          onMove(index, boundary + 1);
        }
      }}
      onPointerDown={event => {
        event.currentTarget.setPointerCapture(event.pointerId);
        moveTo(event.clientX);
      }}
      onPointerMove={event => {
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
          moveTo(event.clientX);
        }
      }}
    />
  );
}
