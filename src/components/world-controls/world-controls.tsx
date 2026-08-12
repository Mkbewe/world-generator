import { useEffect } from 'react';
import {
  Button,
  Card,
  Flex,
  Heading,
  Separator,
  Slider,
  Switch,
  Text,
  TextField,
} from '@radix-ui/themes';

import type { Params } from '../../types/world.types';
import type { IslandCounts } from '../../utils/world-generation/world-generation';
import styles from './world-controls.module.scss';

type NumericParamKey = Exclude<keyof Params, 'seed'>;

interface SliderConfig {
  key: NumericParamKey;
  label: string;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
}

const SLIDERS: readonly SliderConfig[] = [
  { key: 'largeCount', label: 'Large islands count', min: 0, max: 8 },
  { key: 'mediumCount', label: 'Medium islands count', min: 0, max: 15 },
  { key: 'smallCount', label: 'Small islands count', min: 0, max: 25 },
  { key: 'islandSize', label: 'Island size multiplier', min: 50, max: 150, suffix: '%' },
  { key: 'groupChance', label: 'Grouping chance', min: 0, max: 100, suffix: '%' },
  { key: 'seaLevel', label: 'Sea level', min: 0.25, max: 0.55, step: 0.01 },
  { key: 'roughness', label: 'Coastline roughness (Noise)', min: 0, max: 100, suffix: '%' },
];

interface WorldControlsProps {
  params: Params;
  updateParam: <K extends keyof Params>(key: K, value: Params[K]) => void;
  generateMap: () => void;
  isGenerating: boolean;
  useWorker: boolean;
  onUseWorkerChange: (useWorker: boolean) => void;
  generationMetrics?: GenerationMetrics;
  generationError?: string;
}

export interface GenerationMetrics {
  mode: 'main-thread' | 'worker';
  computeDurationMs: number;
  totalDurationMs: number;
  islandCounts: IslandCounts;
}

export function WorldControls({
  params,
  updateParam,
  generateMap,
  isGenerating,
  useWorker,
  onUseWorkerChange,
  generationMetrics,
  generationError,
}: WorldControlsProps) {
  const randomizeSeed = (): void => {
    const newSeed = Math.floor(Math.random() * 1000000);
    updateParam('seed', newSeed.toString());
  };

  useEffect(() => {
    randomizeSeed();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Card size={{ initial: '2', sm: '3' }} className={styles.card}>
      <Flex direction='column' gap='4' className={styles.form}>
        <Heading size='5' className={styles.title}>
          World Settings
        </Heading>
        <Separator size='4' />

        {SLIDERS.map(({ key, label, min, max, step, suffix }) => (
          <Flex key={key} direction='column' gap='2'>
            <Flex justify='between' align='center'>
              <Text size='2' color='gray'>
                {label}:
              </Text>
              <Text size='2' weight='bold' className={styles.value}>
                {params[key]}
                {suffix}
              </Text>
            </Flex>
            <Slider
              value={[params[key]]}
              min={min}
              max={max}
              step={step ?? 1}
              onValueChange={([value]) => updateParam(key, value)}
            />
          </Flex>
        ))}

        <Flex direction='column' gap='2'>
          <Text as='label' htmlFor='seed-input' size='2' color='gray'>
            Seed:
          </Text>
          <Flex gap='2'>
            <TextField.Root
              size='3'
              id='seed-input'
              className={styles.seedInput}
              value={params.seed}
              onChange={e => updateParam('seed', e.target.value)}
            />
            <Button variant='soft' size='3' onClick={randomizeSeed}>
              Randomize
            </Button>
          </Flex>
        </Flex>

        <Flex justify='between' align='center' gap='3'>
          <Text as='label' htmlFor='worker-generation-switch' size='2' color='gray'>
            Generate in Web Worker
          </Text>
          <Switch
            id='worker-generation-switch'
            checked={useWorker}
            disabled={isGenerating}
            onCheckedChange={onUseWorkerChange}
          />
        </Flex>

        <Button
          size='3'
          onClick={generateMap}
          loading={isGenerating}
          className={styles.generateButton}
        >
          Generate
        </Button>

        {generationMetrics && <GenerationMetricsSummary metrics={generationMetrics} />}
        {generationError && (
          <Text size='2' color='red' role='alert'>
            {generationError}
          </Text>
        )}
      </Flex>
    </Card>
  );
}

function GenerationMetricsSummary({ metrics }: { metrics: GenerationMetrics }) {
  const totalIslands =
    metrics.islandCounts.large + metrics.islandCounts.medium + metrics.islandCounts.small;

  return (
    <Flex direction='column' gap='2' aria-live='polite' className={styles.metrics}>
      <Separator size='4' />
      <Text size='2' weight='bold'>
        Last generation
      </Text>
      <Flex justify='between' gap='3'>
        <Text size='2' color='gray'>
          Mode
        </Text>
        <Text size='2' weight='medium'>
          {metrics.mode === 'worker' ? 'Web Worker' : 'Main thread'}
        </Text>
      </Flex>
      <Flex justify='between' gap='3'>
        <Text size='2' color='gray'>
          Compute
        </Text>
        <Text size='2' weight='medium'>
          {metrics.computeDurationMs.toFixed(1)} ms
        </Text>
      </Flex>
      <Flex justify='between' gap='3'>
        <Text size='2' color='gray'>
          End-to-end
        </Text>
        <Text size='2' weight='medium'>
          {metrics.totalDurationMs.toFixed(1)} ms
        </Text>
      </Flex>
      <Flex justify='between' gap='3'>
        <Text size='2' color='gray'>
          Islands
        </Text>
        <Text size='2' weight='medium'>
          {metrics.islandCounts.large} large / {metrics.islandCounts.medium} medium /{' '}
          {metrics.islandCounts.small} small ({totalIslands})
        </Text>
      </Flex>
    </Flex>
  );
}
