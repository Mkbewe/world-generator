import {
  FrameIcon,
  GearIcon,
  GlobeIcon,
  LayersIcon,
  SewingPinIcon,
  SunIcon,
} from '@radix-ui/react-icons';
import { Button, Card, Flex, Heading, Separator } from '@radix-ui/themes';

import {
  BaseClimateForm,
  GeneralForm,
  GeologyForm,
  HeightmapForm,
  MacroRegionForm,
  WorldShapeForm,
} from './forms';
import { TabLinkToggle } from './tab-link-toggle';
import {
  type SettingsTab,
  useGeneralFormStore,
  useViewSyncStore,
  useWorldShapeFormStore,
} from '../../stores';
import { LAYER_CATALOG } from '../../utils/map-layers';
import { type MapBaseLayerId } from '../../utils/map-renderer';
import { type VerticalTabItem, VerticalTabs } from '../vertical-tabs';

interface SettingsPanelProps {
  isGenerating: boolean;
  onGenerate: () => void;
}

export function SettingsPanel({ isGenerating, onGenerate }: SettingsPanelProps) {
  const activeTab = useViewSyncStore(state => state.settingsTab);
  const setSettingsTab = useViewSyncStore(state => state.setSettingsTab);
  const seed = useGeneralFormStore(state => state.seed);
  const setSeed = useGeneralFormStore(state => state.setSeed);
  const shape = useWorldShapeFormStore(state => state.shape);
  const sizeMeters = useWorldShapeFormStore(state => state.sizeMeters);
  const metersPerSample = useWorldShapeFormStore(state => state.metersPerSample);
  const setShape = useWorldShapeFormStore(state => state.setShape);
  const setSizeMeters = useWorldShapeFormStore(state => state.setSizeMeters);
  const setMetersPerSample = useWorldShapeFormStore(state => state.setMetersPerSample);
  const formTabs: Partial<Record<MapBaseLayerId, Omit<VerticalTabItem, 'value'>>> = {
    'world-shape': {
      label: 'World shape',
      icon: <GlobeIcon />,
      content: (
        <WorldShapeForm
          shape={shape}
          sizeMeters={sizeMeters}
          metersPerSample={metersPerSample}
          onShapeChange={setShape}
          onSizeChange={setSizeMeters}
          onDetailChange={setMetersPerSample}
        />
      ),
    },
    'macro-region': {
      label: 'Macro regions',
      icon: <LayersIcon />,
      content: <MacroRegionForm />,
    },
    'heat-zones': {
      label: 'Base Climate',
      icon: <SunIcon />,
      content: <BaseClimateForm />,
    },
    'geology': {
      label: 'Geology',
      icon: <SewingPinIcon />,
      content: <GeologyForm />,
    },
    'heightmap': {
      label: 'Heightmap',
      icon: <FrameIcon />,
      content: <HeightmapForm />,
    },
  };
  const tabs: readonly VerticalTabItem[] = [
    {
      value: 'general',
      label: 'General',
      icon: <GearIcon />,
      content: <GeneralForm seed={seed} onSeedChange={setSeed} />,
    },
    // Form tabs follow the layer catalog order; layers without a form are skipped.
    ...LAYER_CATALOG.flatMap(layer => {
      const form = formTabs[layer.id];
      return form ? [{ value: layer.id, ...form }] : [];
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
