import { useTranslation } from 'react-i18next';
import { MixerHorizontalIcon, RulerHorizontalIcon } from '@radix-ui/react-icons';
import { Button, Flex, Text } from '@radix-ui/themes';

import { PinControl } from '../../pin-control';
import styles from './tool-bar.module.scss';

export interface ToolBarProps {
  /** Whether clicks on the map add measurement points. */
  measuring: boolean;
  onToggleMeasuring: () => void;
  /** Whether map taps pin locations. */
  pinning: boolean;
  onTogglePinning: () => void;
}

/** Measuring and pinning tools of the preview sidebar. */
export function ToolBar({ measuring, onToggleMeasuring, pinning, onTogglePinning }: ToolBarProps) {
  const { t } = useTranslation();

  return (
    <Flex direction='column' gap='3'>
      <Flex align='center' gap='2' className={styles.title}>
        <MixerHorizontalIcon width={20} height={20} />
        <Text size='3' weight='bold'>
          {t('toolBar.title')}
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
          {t('toolBar.measure')}
        </Button>
        <PinControl pinning={pinning} onToggle={onTogglePinning} />
      </Flex>
      <Text size='1' color='gray'>
        {t('toolBar.measureHint')}
      </Text>
    </Flex>
  );
}
