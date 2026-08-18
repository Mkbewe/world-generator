import { useEffect, useRef, useState } from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from '@radix-ui/react-icons';
import {
  Button,
  Card,
  Flex,
  Heading,
  IconButton,
  Separator,
  Switch,
  Table,
  Text,
  TextField,
} from '@radix-ui/themes';

import {
  createWorldGenerationPipeline,
  type GenerationEvent,
  PipelineWorkerClient,
  type StageStatistics,
  type WorldGeneratorConfig,
} from '../../utils/world-generation-pipeline';
import styles from './world-generation-preview.module.scss';

const PREVIEW_SIZE = 300;

const pipeline = createWorldGenerationPipeline();

function formatDuration(durationMs: number | undefined): string {
  return durationMs === undefined ? '—' : `${durationMs.toFixed(1)} ms`;
}

interface PreviewGenerationResult {
  worldMask?: Uint8Array;
  noiseMap?: Float32Array;
  statistics: readonly StageStatistics[];
  totalDurationMs: number;
}

interface PreviewState {
  statistics: readonly StageStatistics[];
  totalDurationMs?: number;
  valueRange?: { min: number; max: number };
}

export function WorldGenerationPreview() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const workerClientRef = useRef<PipelineWorkerClient | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [useWorker, setUseWorker] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [seed, setSeed] = useState('12345');
  const [preview, setPreview] = useState<PreviewState>({ statistics: [] });
  const [error, setError] = useState<string>();

  useEffect(() => {
    return () => workerClientRef.current?.dispose();
  }, []);

  const getWorkerClient = (): PipelineWorkerClient => {
    if (!workerClientRef.current) {
      workerClientRef.current = new PipelineWorkerClient();
    }

    return workerClientRef.current;
  };

  const handleGenerationEvent = (event: GenerationEvent): void => {
    if (event.type !== 'stage-completed') {
      return;
    }

    setPreview(current => {
      const statistics = current.statistics.filter(
        item => item.stageId !== event.statistics.stageId
      );
      statistics.push(event.statistics);
      return { ...current, statistics };
    });
  };

  const generate = async (): Promise<void> => {
    const parsedSeed = Number(seed);

    if (seed.trim() === '' || !Number.isSafeInteger(parsedSeed)) {
      setError('Seed must be an integer.');
      return;
    }

    setError(undefined);
    setIsGenerating(true);

    const config: WorldGeneratorConfig = {
      world: { width: PREVIEW_SIZE, height: PREVIEW_SIZE, seed: parsedSeed },
      noise: { frequency: 4, octaves: 4, persistence: 0.5, lacunarity: 2 },
    };

    try {
      const result: PreviewGenerationResult = useWorker
        ? await getWorkerClient().generate(config, { onEvent: handleGenerationEvent })
        : await pipeline
            .generate(config, {}, { onEvent: handleGenerationEvent })
            .then(generation => ({
              worldMask: generation.context.state.worldMask,
              noiseMap: generation.context.state.noiseMap,
              statistics: generation.statistics,
              totalDurationMs: generation.totalDurationMs,
            }));

      const { noiseMap, worldMask } = result;
      const canvas = canvasRef.current;
      const context = canvas?.getContext('2d');

      if (!noiseMap || !worldMask) {
        setError('Pipeline completed without world mask or noise map.');
        return;
      }

      if (!context) {
        setError('Canvas is not available.');
        return;
      }

      const imageData = context.createImageData(PREVIEW_SIZE, PREVIEW_SIZE);
      let min = Number.POSITIVE_INFINITY;
      let max = Number.NEGATIVE_INFINITY;

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
      setPreview({
        statistics: result.statistics,
        totalDurationMs: result.totalDurationMs,
        valueRange: Number.isFinite(min) ? { min, max } : undefined,
      });
    } catch (generationError) {
      setError(
        generationError instanceof Error ? generationError.message : 'World generation failed.'
      );
    } finally {
      setIsGenerating(false);
    }
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

        <div className={isCollapsed ? styles.expandedContentHidden : styles.expandedContent}>
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
            <Flex align='center' justify='between' gap='2'>
              <Text as='label' htmlFor='pipeline-use-worker' size='2'>
                Generate in a worker
              </Text>
              <Switch id='pipeline-use-worker' checked={useWorker} onCheckedChange={setUseWorker} />
            </Flex>
            <Button onClick={generate} disabled={isGenerating}>
              {isGenerating ? 'Generating...' : 'Generate noise'}
            </Button>
          </Flex>

          <Table.Root size='1' variant='surface'>
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeaderCell>Stage</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Time</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Details</Table.ColumnHeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {pipeline.stages.map(stage => {
                const statistics = preview.statistics.find(item => item.stageId === stage.id);

                return (
                  <Table.Row key={stage.id}>
                    <Table.RowHeaderCell>{stage.name}</Table.RowHeaderCell>
                    <Table.Cell>{formatDuration(statistics?.durationMs)}</Table.Cell>
                    <Table.Cell>
                      {stage.id === 'noise' && preview.valueRange
                        ? `Range ${preview.valueRange.min.toFixed(3)}–${preview.valueRange.max.toFixed(3)}`
                        : '—'}
                    </Table.Cell>
                  </Table.Row>
                );
              })}
              <Table.Row>
                <Table.RowHeaderCell>
                  <Text weight='bold'>Total</Text>
                </Table.RowHeaderCell>
                <Table.Cell>
                  <Text weight='bold'>{formatDuration(preview.totalDurationMs)}</Text>
                </Table.Cell>
                <Table.Cell>—</Table.Cell>
              </Table.Row>
            </Table.Body>
          </Table.Root>
          {error && (
            <Text size='2' color='red' role='alert'>
              {error}
            </Text>
          )}
        </div>
      </Flex>
    </Card>
  );
}
