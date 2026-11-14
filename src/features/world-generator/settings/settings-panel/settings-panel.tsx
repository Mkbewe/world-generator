import { useTranslation } from 'react-i18next';
import {
  FrameIcon,
  GearIcon,
  GlobeIcon,
  LayersIcon,
  SewingPinIcon,
  SunIcon,
} from '@radix-ui/react-icons';
import { Button, Card, Flex, Heading, Separator } from '@radix-ui/themes';

import { TabLinkToggle } from './tab-link-toggle';
import { type VerticalTabItem, VerticalTabs } from '../../../../components/vertical-tabs';
import {
  type SettingsTab,
  useGeneralFormStore,
  useViewSyncStore,
  useWorldShapeFormStore,
} from '../../../../stores';
import { LAYER_CATALOG } from '../../../../utils/map-layers';
import { type MapBaseLayerId } from '../../../../utils/map-renderer';
import {
  BaseClimateForm,
  GeneralForm,
  GeologyForm,
  HeightmapForm,
  MacroRegionForm,
  WorldShapeForm,
} from '../forms';
import { useGeologyRegionLink } from '../hooks/use-geology-region-link';

interface SettingsPanelProps {
  isGenerating: boolean;
  onGenerate: () => void;
}

export function SettingsPanel({ isGenerating, onGenerate }: SettingsPanelProps) {
  const { t } = useTranslation();
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
  const regionLink = useGeologyRegionLink();
  const formTabs: Partial<Record<MapBaseLayerId, Omit<VerticalTabItem<SettingsTab>, 'value'>>> = {
    'world-shape': {
      label: t('settings.worldShape'),
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
      label: t('settings.macroRegions'),
      icon: <LayersIcon />,
      content: <MacroRegionForm />,
    },
    'heat-zones': {
      label: t('settings.baseClimate'),
      icon: <SunIcon />,
      content: <BaseClimateForm />,
    },
    'geology': {
      label: t('settings.geology'),
      icon: <SewingPinIcon />,
      content: <GeologyForm regionLink={regionLink} />,
    },
    'heightmap': {
      label: t('settings.heightmap'),
      icon: <FrameIcon />,
      content: <HeightmapForm regionLink={regionLink} />,
    },
  };
  const tabs: readonly VerticalTabItem<SettingsTab>[] = [
    {
      value: 'general',
      label: t('settings.general'),
      icon: <GearIcon />,
      content: <GeneralForm seed={seed} onSeedChange={setSeed} />,
    },
    // Form tabs follow the layer catalog order; layers without a form are skipped.
    ...LAYER_CATALOG.flatMap(layer => {
      const form = formTabs[layer.id];
      return form ? [{ value: layer.id, ...form }] : [];
    }),
  ];

  return (
    <Card size={{ initial: '2', sm: '3' }}>
      <Flex direction='column' gap='4' height='100%'>
        <Flex justify='between' align='center'>
          <Heading size='5' color='violet'>
            {t('settings.title')}
          </Heading>
          <TabLinkToggle />
        </Flex>
        <Separator size='4' />
        <Flex direction='column' flexGrow='1'>
          <VerticalTabs
            items={tabs}
            ariaLabel={t('settings.ariaLabel')}
            value={activeTab}
            onValueChange={setSettingsTab}
          />
        </Flex>
        <Flex direction='column' gap='4'>
          <Separator size='4' />
          <Button onClick={onGenerate} loading={isGenerating} data-testid='generate-map-button'>
            {t('settings.generate')}
          </Button>
        </Flex>
      </Flex>
    </Card>
  );
}
