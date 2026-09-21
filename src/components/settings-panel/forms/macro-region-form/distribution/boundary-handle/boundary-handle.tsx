import { useRef } from 'react';

import { MIN_MACRO_REGION_SHARE } from '../../../../../../utils/map-generator/stages/macro-region-sizes';
import styles from './boundary-handle.module.scss';

interface BoundaryHandleProps {
  boundary: number;
  index: number;
  onMove: (index: number, percent: number) => void;
  onStep: (index: number, delta: number) => void;
  onCommit: () => void;
  onCancel: () => void;
}

export function BoundaryHandle({
  boundary,
  index,
  onMove,
  onStep,
  onCommit,
  onCancel,
}: BoundaryHandleProps) {
  const handleRef = useRef<HTMLButtonElement>(null);
  const trackRect = useRef<DOMRect | undefined>(undefined);
  const activePointer = useRef<number | undefined>(undefined);

  const moveTo = (clientX: number): void => {
    const rect = trackRect.current;
    if (!rect || rect.width === 0) {
      return;
    }
    onMove(index, ((clientX - rect.left) / rect.width) * 100);
  };

  const release = (element: HTMLButtonElement, pointerId: number): void => {
    if (element.hasPointerCapture?.(pointerId)) {
      element.releasePointerCapture?.(pointerId);
    }
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
          onStep(index, -1);
        }
        if (event.key === 'ArrowRight') {
          event.preventDefault();
          onStep(index, 1);
        }
      }}
      onPointerDown={event => {
        activePointer.current = event.pointerId;
        event.currentTarget.setPointerCapture?.(event.pointerId);
        trackRect.current = handleRef.current?.parentElement?.getBoundingClientRect();
        moveTo(event.clientX);
      }}
      onPointerMove={event => {
        if (activePointer.current === event.pointerId) {
          moveTo(event.clientX);
        }
      }}
      onPointerUp={event => {
        if (activePointer.current !== event.pointerId) {
          return;
        }
        activePointer.current = undefined;
        trackRect.current = undefined;
        release(event.currentTarget, event.pointerId);
        onCommit();
      }}
      onPointerCancel={event => {
        if (activePointer.current !== event.pointerId) {
          return;
        }
        activePointer.current = undefined;
        trackRect.current = undefined;
        release(event.currentTarget, event.pointerId);
        onCancel();
      }}
    />
  );
}
