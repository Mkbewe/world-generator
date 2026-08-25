import type { RefObject } from 'react';
import { Card, Flex, Heading, Separator } from '@radix-ui/themes';

import styles from './preview-map.module.scss';

interface PreviewMapProps {
  width: number;
  height: number;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  label: string;
}

export function PreviewMap({ width, height, canvasRef, label }: PreviewMapProps) {
  return (
    <Card size={{ initial: '2', sm: '3' }}>
      <Flex direction='column' gap='4'>
        <Heading size='5' color='violet'>
          Preview
        </Heading>
        <Separator size='4' />
        <div className={styles.previewWrapper}>
          <canvas
            ref={canvasRef}
            width={width}
            height={height}
            className={styles.canvas}
            aria-label={label}
          />
        </div>
      </Flex>
    </Card>
  );
}
