import { MixerHorizontalIcon, RulerHorizontalIcon } from '@radix-ui/react-icons';
import { Button, Flex, Text } from '@radix-ui/themes';

import styles from './measure-controls.module.scss';

interface MeasureControlsProps {
  /** Whether dragging the map measures a distance. */
  measuring: boolean;
  onToggleMeasuring: () => void;
}

/** Distance measuring controls of the preview. */
export function MeasureControls({ measuring, onToggleMeasuring }: MeasureControlsProps) {
  return (
    <Flex direction='column' gap='3'>
      <Flex align='center' gap='2' className={styles.title}>
        <MixerHorizontalIcon width={20} height={20} />
        <Text size='3' weight='bold'>
          Controls
        </Text>
      </Flex>
      <Flex align='center' gap='2'>
        <Button
          size='1'
          variant={measuring ? 'solid' : 'soft'}
          color={measuring ? 'violet' : 'gray'}
          aria-pressed={measuring}
          onClick={onToggleMeasuring}
        >
          <RulerHorizontalIcon />
          Measure
        </Button>
      </Flex>
      <Text size='1' color='gray'>
        Drag on the map to measure a distance.
      </Text>
    </Flex>
  );
}
