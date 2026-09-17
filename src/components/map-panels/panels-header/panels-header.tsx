import {
  ArrowDownIcon,
  ArrowUpIcon,
  DoubleArrowLeftIcon,
  DoubleArrowRightIcon,
  HeightIcon,
} from '@radix-ui/react-icons';
import { Flex, IconButton, SegmentedControl, Text } from '@radix-ui/themes';

export type PanelPosition = 'top' | 'middle' | 'bottom';

interface PanelsHeaderProps {
  collapsed: boolean;
  position: PanelPosition;
  onPositionChange: (position: PanelPosition) => void;
  onCollapsedChange: (collapsed: boolean) => void;
}

export function PanelsHeader({
  collapsed,
  position,
  onPositionChange,
  onCollapsedChange,
}: PanelsHeaderProps) {
  if (collapsed) {
    return <CollapseButton collapsed onToggle={() => onCollapsedChange(false)} />;
  }

  return (
    <Flex justify='between' align='center' gap='2'>
      <Text size='2' weight='bold' color='gray'>
        Panels
      </Text>
      <Flex align='center' gap='2'>
        <SegmentedControl.Root
          size='1'
          aria-label='Panel position'
          value={position}
          onValueChange={value => onPositionChange(value as PanelPosition)}
        >
          <SegmentedControl.Item value='top' aria-label='Move panels to top'>
            <ArrowUpIcon />
          </SegmentedControl.Item>
          <SegmentedControl.Item value='middle' aria-label='Center panels'>
            <HeightIcon />
          </SegmentedControl.Item>
          <SegmentedControl.Item value='bottom' aria-label='Move panels to bottom'>
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
  return (
    <IconButton
      size='1'
      variant='surface'
      color='gray'
      title={collapsed ? 'Show panels' : 'Hide panels'}
      aria-label={collapsed ? 'Show panels' : 'Hide panels'}
      onClick={onToggle}
    >
      {collapsed ? <DoubleArrowLeftIcon /> : <DoubleArrowRightIcon />}
    </IconButton>
  );
}
