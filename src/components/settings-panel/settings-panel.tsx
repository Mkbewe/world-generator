import { GearIcon, GlobeIcon, LayersIcon, SewingPinIcon } from '@radix-ui/react-icons';
import { Button, Card, Flex, Heading, Separator } from '@radix-ui/themes';

import {
  GeneralForm,
  GeologyForm,
  MacroRegionForm,
  type WorldShape,
  WorldShapeForm,
  type WorldSize,
} from './forms';
import { TabLinkToggle } from './tab-link-toggle';
import { type SettingsTab, useViewSyncStore } from '../../stores';
import { LAYER_CATALOG } from '../../utils/map-layers';
import { type MapBaseLayerId } from '../../utils/map-renderer';
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
}: SettingsPanelProps) {
  const activeTab = useViewSyncStore(state => state.settingsTab);
  const setSettingsTab = useViewSyncStore(state => state.setSettingsTab);
  const formTabs: Record<MapBaseLayerId, Omit<VerticalTabItem, 'value'>> = {
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
    'macro-region': {
      label: 'Macro regions',
      icon: <LayersIcon />,
      content: <MacroRegionForm />,
    },
    geology: {
      label: 'Geology',
      icon: <SewingPinIcon />,
      content: <GeologyForm />,
    },
  };
  const tabs: readonly VerticalTabItem[] = [
    {
      value: 'general',
      label: 'General',
      icon: <GearIcon />,
      content: <GeneralForm seed={seed} onSeedChange={onSeedChange} />,
    },
    // Form tabs follow the layer catalog order.
    ...LAYER_CATALOG.map(layer => ({ value: layer.id, ...formTabs[layer.id] })),
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
