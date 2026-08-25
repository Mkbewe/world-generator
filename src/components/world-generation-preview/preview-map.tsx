import type { RefObject } from 'react';

import styles from './world-generation-preview.module.scss';

interface PreviewMapProps {
  width: number;
  height: number;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  label: string;
}

export function PreviewMap({ width, height, canvasRef, label }: PreviewMapProps) {
  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className={styles.canvas}
      aria-label={label}
    />
  );
}
