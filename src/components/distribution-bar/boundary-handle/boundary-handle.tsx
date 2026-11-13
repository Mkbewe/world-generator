import { useRef } from 'react';
import { useTranslation } from 'react-i18next';

import styles from './boundary-handle.module.scss';

interface BoundaryHandleProps {
  boundary: number;
  index: number;
  /** Smallest share one side may keep, in percent of the whole bar. */
  minShare?: number;
  onMove: (index: number, percent: number) => void;
  onStep: (index: number, delta: number) => void;
  onCommit: () => void;
  onCancel: () => void;
}

export function BoundaryHandle({
  boundary,
  index,
  minShare = 0,
  onMove,
  onStep,
  onCommit,
  onCancel,
}: BoundaryHandleProps) {
  const { t } = useTranslation();
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
      aria-label={t('distribution.boundary', { index: index + 1 })}
      aria-orientation='horizontal'
      aria-valuemin={minShare}
      aria-valuemax={100 - minShare}
      aria-valuenow={Math.round(boundary)}
      aria-valuetext={`${Math.round(boundary)}%`}
      className={styles.distributionHandle}
      style={{ left: `${boundary}%` }}
      onKeyDown={event => {
        let delta: number;
        switch (event.key) {
          case 'ArrowLeft':
            delta = -1;
            break;
          case 'ArrowRight':
            delta = 1;
            break;
          case 'PageDown':
            delta = -10;
            break;
          case 'PageUp':
            delta = 10;
            break;
          case 'Home':
            delta = minShare - boundary;
            break;
          case 'End':
            delta = 100 - minShare - boundary;
            break;
          default:
            return;
        }
        event.preventDefault();
        onStep(index, delta);
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
