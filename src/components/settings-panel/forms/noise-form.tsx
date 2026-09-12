import { Flex, Slider, Text } from '@radix-ui/themes';

import type { NoiseConfig } from '../../../utils/map-generator';
import { InfoLabel } from '../../info-label';

type NoiseFieldKey = keyof NoiseConfig;

interface NoiseField {
  key: NoiseFieldKey;
  label: string;
  description: string;
  min: number;
  max: number;
  step: number;
  format: (value: number) => string;
}

const NOISE_FIELDS: readonly NoiseField[] = [
  {
    key: 'frequency',
    label: 'Frequency',
    min: 0.5,
    max: 16,
    step: 0.5,
    format: value => value.toFixed(1),
    description:
      'How many noise cycles fit across the world. Lower values create large continents, higher values create fine-grained noise.',
  },
  {
    key: 'octaves',
    label: 'Octaves',
    min: 1,
    max: 8,
    step: 1,
    format: value => String(value),
    description:
      'How many noise layers are summed together. More octaves add detail and increase generation time.',
  },
  {
    key: 'persistence',
    label: 'Persistence',
    min: 0.1,
    max: 1,
    step: 0.05,
    format: value => value.toFixed(2),
    description:
      'How much each octave contributes compared to the previous one. Higher values are rougher, lower values are smoother.',
  },
  {
    key: 'lacunarity',
    label: 'Lacunarity',
    min: 1.5,
    max: 4,
    step: 0.1,
    format: value => value.toFixed(1),
    description: 'How fast the frequency grows between octaves. Higher values add finer detail.',
  },
];

interface NoiseFormProps {
  noise: NoiseConfig;
  onNoiseChange: (noise: NoiseConfig) => void;
}

export function NoiseForm({ noise, onNoiseChange }: NoiseFormProps) {
  const updateField = (key: NoiseFieldKey, value: number): void => {
    onNoiseChange({ ...noise, [key]: value });
  };

  return (
    <Flex direction='column' gap='4'>
      {NOISE_FIELDS.map(field => (
        <Flex key={field.key} direction='column' gap='2'>
          <Flex justify='between' align='center'>
            <InfoLabel label={field.label} description={field.description} />
            <Text size='2' weight='bold'>
              {field.format(noise[field.key])}
            </Text>
          </Flex>
          <Slider
            value={[noise[field.key]]}
            min={field.min}
            max={field.max}
            step={field.step}
            aria-label={field.label}
            onValueChange={([value]) => updateField(field.key, value)}
          />
        </Flex>
      ))}
    </Flex>
  );
}
