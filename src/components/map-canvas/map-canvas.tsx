import type { PointerEventHandler, RefObject } from 'react';
import { Text } from '@radix-ui/themes';

import styles from './map-canvas.module.scss';

export interface MapCanvasHandlers {
  onPointerMove: PointerEventHandler<HTMLCanvasElement>;
  onPointerDown: PointerEventHandler<HTMLCanvasElement>;
  onPointerUp: PointerEventHandler<HTMLCanvasElement>;
  onPointerCancel: PointerEventHandler<HTMLCanvasElement>;
}

interface MapCanvasProps {
  wrapperRef: RefObject<HTMLDivElement | null>;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  overlayRef: RefObject<HTMLCanvasElement | null>;
  handlers: MapCanvasHandlers;
  /** Whether a map is displayed; toggles the placeholder and the cursor. */
  ready: boolean;
  /** Centers the square in the available space, used by the fullscreen mode. */
  expanded?: boolean;
}

export function MapCanvas({
  wrapperRef,
  canvasRef,
  overlayRef,
  handlers,
  ready,
  expanded = false,
}: MapCanvasProps) {
  return (
    <div className={styles.area} data-expanded={expanded || undefined}>
      <div ref={wrapperRef} className={styles.wrapper}>
        {!ready && (
          <div className={styles.placeholder}>
            <img
              src='/preview-placeholder.svg'
              alt=''
              aria-hidden='true'
              className={styles.placeholderIcon}
            />
            <Text size='2' color='gray'>
              Generate a map to see the preview.
            </Text>
          </div>
        )}
        <canvas
          ref={canvasRef}
          width={0}
          height={0}
          className={styles.canvas}
          data-ready={ready || undefined}
          aria-label='Generated map preview'
          {...handlers}
        />
        <canvas
          ref={overlayRef}
          width={0}
          height={0}
          className={styles.overlayCanvas}
          aria-hidden='true'
        />
      </div>
    </div>
  );
}
