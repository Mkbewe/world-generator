import { useEffect } from 'react';
import { Button, Card, Flex, Heading, Separator, Slider, Text, TextField } from '@radix-ui/themes';

import type { Params } from '../../types/world.types';
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
}

export function WorldControls({ params, updateParam, generateMap }: WorldControlsProps) {
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

        <Button size='3' onClick={generateMap} className={styles.generateButton}>
          Generate
        </Button>
      </Flex>
    </Card>
  );
}
