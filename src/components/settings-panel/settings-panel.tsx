import {
  GearIcon,
  GlobeIcon,
  LayersIcon,
  MixerHorizontalIcon,
  SewingPinIcon,
} from '@radix-ui/react-icons';
import { Button, Card, Flex, Heading, Separator } from '@radix-ui/themes';

import {
  GeneralForm,
  LandmassForm,
  MacroRegionForm,
  NoiseForm,
  type WorldShape,
  WorldShapeForm,
  type WorldSize,
} from './forms';
import { TabLinkToggle } from './tab-link-toggle';
import { type SettingsTab, useViewSyncStore } from '../../stores';
import { type NoiseConfig, PIPELINE_STAGES, type PipelineStageId } from '../../utils/map-generator';
import { type VerticalTabItem, VerticalTabs } from '../vertical-tabs';

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
  const activeTab = useViewSyncStore(state => state.settingsTab);
  const setSettingsTab = useViewSyncStore(state => state.setSettingsTab);
  const stageTabs: Readonly<Partial<Record<PipelineStageId, Omit<VerticalTabItem, 'value'>>>> = {
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
    'landmass-layout': {
      label: 'Landmasses',
      icon: <SewingPinIcon />,
      content: <LandmassForm />,
    },
  };
  const tabs: readonly VerticalTabItem[] = [
    {
      value: 'general',
      label: 'General',
      icon: <GearIcon />,
      content: <GeneralForm seed={seed} onSeedChange={onSeedChange} />,
    },
    // Stages without a form yet simply have no settings tab.
    ...PIPELINE_STAGES.flatMap(stage => {
      const tab = stageTabs[stage.id];
      return tab ? [{ value: stage.id, ...tab }] : [];
    }),
  ];

  const handleTabChange = (value: string): void => {
    setSettingsTab(value as SettingsTab);
  };

  return (
    <Card size={{ initial: '2', sm: '3' }}>
      <Flex direction='column' gap='4' height='100%'>
        <Flex justify='between' align='center'>
          <Heading size='5' color='violet'>
            Map Settings
          </Heading>
          <TabLinkToggle />
        </Flex>
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
