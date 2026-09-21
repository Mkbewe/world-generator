import { useState } from 'react';
import { GearIcon, GlobeIcon, LayersIcon, MixerHorizontalIcon } from '@radix-ui/react-icons';
import { Button, Card, Flex, Heading, Separator } from '@radix-ui/themes';

import {
  GeneralForm,
  MacroRegionForm,
  NoiseForm,
  type WorldShape,
  WorldShapeForm,
  type WorldSize,
} from './forms';
import { type NoiseConfig, PIPELINE_STAGES, type PipelineStageId } from '../../utils/map-generator';
import { type VerticalTabItem, VerticalTabs } from '../vertical-tabs';

type SettingsTab = 'general' | PipelineStageId;

let activeSettingsTab: SettingsTab = 'general';

interface SettingsPanelProps {
  seed: string;
  onSeedChange: (seed: string) => void;
  isGenerating: boolean;
  onGenerate: () => void;
  shape: WorldShape;
  sizeMeters: WorldSize;
  metersPerSample: number;
  onShapeChange: (shape: WorldShape) => void;
  onSizeChange: (sizeMeters: WorldSize) => void;
  onDetailChange: (metersPerSample: number) => void;
  noise: NoiseConfig;
  onNoiseChange: (noise: NoiseConfig) => void;
}

export function SettingsPanel({
  seed,
  onSeedChange,
  isGenerating,
  onGenerate,
  shape,
  sizeMeters,
  metersPerSample,
  onShapeChange,
  onSizeChange,
  onDetailChange,
  noise,
  onNoiseChange,
}: SettingsPanelProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>(activeSettingsTab);
  const stageTabs: Readonly<Record<PipelineStageId, Omit<VerticalTabItem, 'value'>>> = {
    'world-shape': {
      label: 'World shape',
      icon: <GlobeIcon />,
      content: (
        <WorldShapeForm
          shape={shape}
          sizeMeters={sizeMeters}
          metersPerSample={metersPerSample}
          onShapeChange={onShapeChange}
          onSizeChange={onSizeChange}
          onDetailChange={onDetailChange}
        />
      ),
    },
    noise: {
      label: 'Noise',
      icon: <MixerHorizontalIcon />,
      content: <NoiseForm noise={noise} onNoiseChange={onNoiseChange} />,
    },
    'macro-region': {
      label: 'Macro regions',
      icon: <LayersIcon />,
      content: <MacroRegionForm />,
    },
  };
  const tabs: readonly VerticalTabItem[] = [
    {
      value: 'general',
      label: 'General',
      icon: <GearIcon />,
      content: <GeneralForm seed={seed} onSeedChange={onSeedChange} />,
    },
    ...PIPELINE_STAGES.map(stage => ({ value: stage.id, ...stageTabs[stage.id] })),
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
          <Button onClick={onGenerate} loading={isGenerating} data-testid='generate-map-button'>
            Generate Map
          </Button>
        </Flex>
      </Flex>
    </Card>
  );
}
