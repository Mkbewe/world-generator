import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Box, Card, Flex, Heading, Separator, Text } from '@radix-ui/themes';

import type { Params } from '../types';
import { LegacyWorldGenerationWorkerClient } from '../utils/legacy-world-generation-worker-client';
import { drawWorldPixels, generateWorldPixels, type IslandCounts } from '../utils/world-generation';
import styles from './world-canvas.module.scss';

interface WorldCursor {
  x: number;
  y: number;
}

export interface WorldCanvasRef {
  generate: (useWorker: boolean) => Promise<WorldCanvasGenerationResult>;
  exportMap: () => void;
}

export interface WorldCanvasGenerationResult {
  computeDurationMs: number;
  islandCounts: IslandCounts;
}

interface WorldCanvasProps {
  params: Params;
  onSeedGenerated: (seed: string) => void;
}

export const WorldCanvas = forwardRef<WorldCanvasRef, WorldCanvasProps>(
  ({ params, onSeedGenerated }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const workerClientRef = useRef<LegacyWorldGenerationWorkerClient | null>(null);
    const [cursorWorld, setCursorWorld] = useState<WorldCursor>({ x: 0, y: 0 });

    if (!workerClientRef.current) {
      workerClientRef.current = new LegacyWorldGenerationWorkerClient();
    }

    useEffect(() => {
      const workerClient = workerClientRef.current;
      return () => workerClient?.dispose();
    }, []);

    const getWorldCoordinates = (event: React.PointerEvent<HTMLCanvasElement>): WorldCursor => {
      const rect = event.currentTarget.getBoundingClientRect();
      const scaleX = event.currentTarget.width / rect.width;
      const scaleY = event.currentTarget.height / rect.height;
      const localX = (event.clientX - rect.left) * scaleX;
      const localY = (event.clientY - rect.top) * scaleY;

      return {
        x: localX - event.currentTarget.width / 2,
        y: event.currentTarget.height / 2 - localY,
      };
    };

    const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>): void => {
      setCursorWorld(getWorldCoordinates(event));
    };

    const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>): void => {
      setCursorWorld(getWorldCoordinates(event));
    };

    const generate = async (useWorker: boolean): Promise<WorldCanvasGenerationResult> => {
      const canvas = canvasRef.current;
      if (!canvas) {
        throw new Error('Canvas is not available.');
      }

      const result = useWorker
        ? await workerClientRef.current!.generate(canvas.width, canvas.height, params)
        : (() => {
            const startedAt = performance.now();
            return {
              type: 'result' as const,
              requestId: 0,
              ...generateWorldPixels(canvas.width, canvas.height, params),
              computeDurationMs: performance.now() - startedAt,
            };
          })();

      drawWorldPixels(canvas, result.pixels);

      if (!params.seed) {
        onSeedGenerated(result.seed);
      }

      return {
        computeDurationMs: result.computeDurationMs,
        islandCounts: result.islandCounts,
      };
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
            <canvas
              ref={canvasRef}
              className={styles.canvas}
              width='4000'
              height='4000'
              onPointerMove={handlePointerMove}
              onPointerDown={handlePointerDown}
              onPointerLeave={() => setCursorWorld({ x: 0, y: 0 })}
            />
          </Flex>
        </Flex>
        <Box className={styles.coordsHud} aria-live='polite'>
          <Text as='span' size='2' weight='medium' className={styles.coordRow}>
            <span className={styles.coordLabel}>X:</span>
            <span className={styles.coordValue}>{cursorWorld.x.toFixed(0)}</span>
          </Text>
          <Text as='span' size='2' weight='medium' className={styles.coordRow}>
            <span className={styles.coordLabel}>Y:</span>
            <span className={styles.coordValue}>{cursorWorld.y.toFixed(0)}</span>
          </Text>
        </Box>
      </Card>
    );
  }
);

WorldCanvas.displayName = 'WorldCanvas';
