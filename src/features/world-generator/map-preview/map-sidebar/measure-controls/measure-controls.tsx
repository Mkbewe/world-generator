import { useTranslation } from 'react-i18next';
import { MixerHorizontalIcon, RulerHorizontalIcon } from '@radix-ui/react-icons';
import { Button, Flex, Text } from '@radix-ui/themes';

import styles from './measure-controls.module.scss';

export interface MeasureControlsProps {
  /** Whether clicks on the map add measurement points. */
  measuring: boolean;
  onToggleMeasuring: () => void;
}

/** Distance measuring controls of the preview. */
export function MeasureControls({ measuring, onToggleMeasuring }: MeasureControlsProps) {
  const { t } = useTranslation();

  return (
    <Flex direction='column' gap='3'>
      <Flex align='center' gap='2' className={styles.title}>
        <MixerHorizontalIcon width={20} height={20} />
        <Text size='3' weight='bold'>
          {t('measureControls.title')}
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
          {t('measureControls.toggle')}
        </Button>
      </Flex>
      <Text size='1' color='gray'>
        {t('measureControls.hint')}
      </Text>
    </Flex>
  );
}
