import { forwardRef, useImperativeHandle, useRef } from 'react';
import { Card, Flex, Heading, Separator } from '@radix-ui/themes';

import type { Params } from '../../types/world.types';
import { generateWorldMap } from '../../utils/world-generation/world-generation';
import styles from './world-canvas.module.scss';

export interface WorldCanvasRef {
  generate: () => void;
  exportMap: () => void;
}

interface WorldCanvasProps {
  params: Params;
  onSeedGenerated: (seed: string) => void;
}

export const WorldCanvas = forwardRef<WorldCanvasRef, WorldCanvasProps>(
  ({ params, onSeedGenerated }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const generate = (): void => {
      if (!canvasRef.current) {
        return;
      }

      generateWorldMap(canvasRef.current, params, onSeedGenerated);
    };

    const exportMap = (): void => {
      if (!canvasRef.current) {
        return;
      }

      const link = document.createElement('a');
      link.download = `world-map-${params.seed || Date.now()}.png`;
      link.href = canvasRef.current.toDataURL('image/png');
      link.click();
    };

    useImperativeHandle(ref, () => ({ generate, exportMap }));

    return (
      <Card size={{ initial: '2', sm: '3' }} className={styles.card}>
        <Flex direction='column' gap='4' className={styles.container}>
          <Heading size='5' className={styles.title}>
            World Preview
          </Heading>
          <Separator size='4' />

          <Flex justify='center' align='center' className={styles.canvasWrapper}>
            <canvas ref={canvasRef} className={styles.canvas} width='720' height='720' />
          </Flex>
        </Flex>
      </Card>
    );
  }
);

WorldCanvas.displayName = 'WorldCanvas';
