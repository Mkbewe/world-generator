import { useRef, useState } from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from '@radix-ui/react-icons';
import {
  Button,
  Card,
  Flex,
  Heading,
  IconButton,
  Separator,
  Table,
  Text,
  TextField,
} from '@radix-ui/themes';

import {
  NoiseStage,
  type StageStatistics,
  WorldGenerationPipeline,
  type WorldGenerationState,
  type WorldGeneratorConfig,
  WorldShapeStage,
} from '../../utils/world-generation-pipeline';
import styles from './world-generation-preview.module.scss';

const PREVIEW_SIZE = 300;

const pipeline = new WorldGenerationPipeline<WorldGeneratorConfig, WorldGenerationState>([
  new WorldShapeStage(),
  new NoiseStage(),
]);

export function WorldGenerationPreview() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [seed, setSeed] = useState('12345');
  const [durationMs, setDurationMs] = useState<number>();
  const [stageStatistics, setStageStatistics] = useState<readonly StageStatistics[]>([]);
  const [valueRange, setValueRange] = useState<{ min: number; max: number }>();
  const [error, setError] = useState<string>();

  const generate = async (): Promise<void> => {
    const parsedSeed = Number(seed);

    if (seed.trim() === '' || !Number.isSafeInteger(parsedSeed)) {
      setError('Seed must be an integer.');
      return;
    }

    setError(undefined);

    const config: WorldGeneratorConfig = {
      world: { width: PREVIEW_SIZE, height: PREVIEW_SIZE, seed: parsedSeed },
      noise: { frequency: 4, octaves: 4, persistence: 0.5, lacunarity: 2 },
    };

    const result = await pipeline.generate(config, {});
    const noiseMap = result.context.state.noiseMap;
    const worldMask = result.context.state.worldMask;
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');

    if (!noiseMap || !worldMask || !context) {
      setError('Canvas is not available.');
      return;
    }

    const imageData = context.createImageData(PREVIEW_SIZE, PREVIEW_SIZE);
    let min = 1;
    let max = 0;

    for (let index = 0; index < noiseMap.length; index++) {
      if (worldMask[index] === 0) {
        continue;
      }

      const value = noiseMap[index];
      const color = Math.round(value * 255);
      const pixelIndex = index * 4;

      imageData.data[pixelIndex] = color;
      imageData.data[pixelIndex + 1] = color;
      imageData.data[pixelIndex + 2] = color;
      imageData.data[pixelIndex + 3] = 255;
      min = Math.min(min, value);
      max = Math.max(max, value);
    }

    context.putImageData(imageData, 0, 0);
    setDurationMs(result.totalDurationMs);
    setStageStatistics(result.statistics);
    setValueRange({ min, max });
  };

  return (
    <Card
      size={{ initial: '2', sm: '3' }}
      className={`${styles.card} ${isCollapsed ? styles.collapsed : ''}`}
    >
      <Flex direction='column' gap='4' height='100%'>
        <Flex justify={isCollapsed ? 'center' : 'between'} align='center' gap='2'>
          {!isCollapsed && (
            <Heading size='5' className={styles.title}>
              Pipeline Noise Preview
            </Heading>
          )}
          <IconButton
            type='button'
            variant='ghost'
            color='gray'
            aria-label={isCollapsed ? 'Expand pipeline preview' : 'Collapse pipeline preview'}
            title={isCollapsed ? 'Expand preview' : 'Collapse preview'}
            onClick={() => setIsCollapsed(collapsed => !collapsed)}
          >
            {isCollapsed ? <ChevronLeftIcon /> : <ChevronRightIcon />}
          </IconButton>
        </Flex>

        {!isCollapsed && (
          <>
            <Separator size='4' />

            <canvas
              ref={canvasRef}
              width={PREVIEW_SIZE}
              height={PREVIEW_SIZE}
              className={styles.canvas}
              aria-label='Generated noise preview'
            />

            <Flex direction='column' gap='2'>
              <Text as='label' htmlFor='pipeline-seed-input' size='2' color='gray'>
                Seed:
              </Text>
              <TextField.Root
                id='pipeline-seed-input'
                value={seed}
                onChange={event => setSeed(event.target.value)}
              />
              <Button onClick={generate}>Generate noise</Button>
            </Flex>

            {durationMs !== undefined && valueRange && (
              <Table.Root size='1' variant='surface'>
                <Table.Header>
                  <Table.Row>
                    <Table.ColumnHeaderCell>Stage</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell justify='end'>Time</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>Details</Table.ColumnHeaderCell>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {stageStatistics.map(statistics => (
                    <Table.Row key={statistics.stageId}>
                      <Table.RowHeaderCell>{statistics.stageName}</Table.RowHeaderCell>
                      <Table.Cell justify='end'>{statistics.durationMs.toFixed(1)} ms</Table.Cell>
                      <Table.Cell>
                        {statistics.stageId === 'noise'
                          ? `Range ${valueRange.min.toFixed(3)}–${valueRange.max.toFixed(3)}`
                          : '—'}
                      </Table.Cell>
                    </Table.Row>
                  ))}
                  <Table.Row>
                    <Table.RowHeaderCell>
                      <Text weight='bold'>Total</Text>
                    </Table.RowHeaderCell>
                    <Table.Cell justify='end'>
                      <Text weight='bold'>{durationMs.toFixed(1)} ms</Text>
                    </Table.Cell>
                    <Table.Cell>—</Table.Cell>
                  </Table.Row>
                </Table.Body>
              </Table.Root>
            )}
            {error && (
              <Text size='2' color='red' role='alert'>
                {error}
              </Text>
            )}
          </>
        )}
      </Flex>
    </Card>
  );
}
