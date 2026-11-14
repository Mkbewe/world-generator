import { useTranslation } from 'react-i18next';
import {
  ArrowDownIcon,
  ArrowUpIcon,
  DoubleArrowLeftIcon,
  DoubleArrowRightIcon,
  HeightIcon,
} from '@radix-ui/react-icons';
import { Flex, IconButton, SegmentedControl, Text } from '@radix-ui/themes';

import { isOneOf } from '../../../../../components/lib/option-value';

const PANEL_POSITIONS = ['top', 'middle', 'bottom'] as const;

export type PanelPosition = (typeof PANEL_POSITIONS)[number];

interface PanelHeaderProps {
  collapsed: boolean;
  position: PanelPosition;
  onPositionChange: (position: PanelPosition) => void;
  onCollapsedChange: (collapsed: boolean) => void;
}

export function PanelHeader({
  collapsed,
  position,
  onPositionChange,
  onCollapsedChange,
}: PanelHeaderProps) {
  const { t } = useTranslation();

  if (collapsed) {
    return <CollapseButton collapsed onToggle={() => onCollapsedChange(false)} />;
  }

  return (
    <Flex justify='between' align='center' gap='2'>
      <Text size='2' weight='bold' color='gray'>
        {t('panelHeader.title')}
      </Text>
      <Flex align='center' gap='2'>
        <SegmentedControl.Root
          size='1'
          aria-label={t('panelHeader.position')}
          value={position}
          onValueChange={value => {
            if (isOneOf(value, PANEL_POSITIONS)) {
              onPositionChange(value);
            }
          }}
        >
          <SegmentedControl.Item value='top' aria-label={t('panelHeader.moveTop')}>
            <ArrowUpIcon />
          </SegmentedControl.Item>
          <SegmentedControl.Item value='middle' aria-label={t('panelHeader.center')}>
            <HeightIcon />
          </SegmentedControl.Item>
          <SegmentedControl.Item value='bottom' aria-label={t('panelHeader.moveBottom')}>
            <ArrowDownIcon />
          </SegmentedControl.Item>
        </SegmentedControl.Root>
        <CollapseButton onToggle={() => onCollapsedChange(true)} />
      </Flex>
    </Flex>
  );
}

interface CollapseButtonProps {
  collapsed?: boolean;
  onToggle: () => void;
}

function CollapseButton({ collapsed = false, onToggle }: CollapseButtonProps) {
  const { t } = useTranslation();
  const label = t(collapsed ? 'panelHeader.show' : 'panelHeader.hide');

  return (
    <IconButton
      size='1'
      variant='surface'
      color='gray'
      title={label}
      aria-label={label}
      onClick={onToggle}
    >
      {collapsed ? <DoubleArrowLeftIcon /> : <DoubleArrowRightIcon />}
    </IconButton>
  );
}
