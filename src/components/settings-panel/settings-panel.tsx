import { useState } from 'react';
import { GearIcon, GlobeIcon } from '@radix-ui/react-icons';
import { Button, Card, Flex, Heading, Separator } from '@radix-ui/themes';

import { BasicForm, type WorldShape, WorldShapeForm, type WorldSize } from './forms';
import { type VerticalTabItem, VerticalTabs } from '../vertical-tabs';

type SettingsTab = 'basic' | 'world-shape';

let activeSettingsTab: SettingsTab = 'basic';

interface SettingsPanelProps {
  seed: string;
  onSeedChange: (seed: string) => void;
  isGenerating: boolean;
  onGenerate: () => void;
  shape: WorldShape;
  size: WorldSize;
  onShapeChange: (shape: WorldShape) => void;
  onSizeChange: (size: WorldSize) => void;
}

export function SettingsPanel({
  seed,
  onSeedChange,
  isGenerating,
  onGenerate,
  shape,
  size,
  onShapeChange,
  onSizeChange,
}: SettingsPanelProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>(activeSettingsTab);
  const tabs: readonly VerticalTabItem[] = [
    {
      value: 'basic',
      label: 'Basic',
      icon: <GearIcon />,
      content: <BasicForm seed={seed} onSeedChange={onSeedChange} />,
    },
    {
      value: 'world-shape',
      label: 'World shape',
      icon: <GlobeIcon />,
      content: (
        <WorldShapeForm
          shape={shape}
          size={size}
          onShapeChange={onShapeChange}
          onSizeChange={onSizeChange}
        />
      ),
    },
  ];

  const handleTabChange = (value: string): void => {
    const nextTab = value as SettingsTab;
    activeSettingsTab = nextTab;
    setActiveTab(nextTab);
  };

  return (
    <Card size={{ initial: '2', sm: '3' }}>
      <Flex direction='column' gap='4' height='100%'>
        <Heading size='5' color='violet'>
          Map Settings
        </Heading>
        <Separator size='4' />
        <Flex direction='column' flexGrow='1'>
          <VerticalTabs
            items={tabs}
            ariaLabel='Generation settings'
            value={activeTab}
            onValueChange={handleTabChange}
          />
        </Flex>
        <Flex direction='column' gap='4'>
          <Separator size='4' />
          <Button onClick={onGenerate} disabled={isGenerating} data-testid='generate-map-button'>
            {isGenerating ? 'Generating...' : 'Generate Map'}
          </Button>
        </Flex>
      </Flex>
    </Card>
  );
}
