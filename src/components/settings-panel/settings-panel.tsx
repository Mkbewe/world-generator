import { GearIcon, MagicWandIcon } from '@radix-ui/react-icons';
import { Button, Card, Flex, Heading, Separator } from '@radix-ui/themes';

import { BasicForm, DummyForm } from './forms';
import { type VerticalTabItem, VerticalTabs } from '../vertical-tabs';

interface SettingsPanelProps {
  seed: string;
  onSeedChange: (seed: string) => void;
  useWorker: boolean;
  onUseWorkerChange: (useWorker: boolean) => void;
  isGenerating: boolean;
  onGenerate: () => void;
}

export function SettingsPanel({
  seed,
  onSeedChange,
  useWorker,
  onUseWorkerChange,
  isGenerating,
  onGenerate,
}: SettingsPanelProps) {
  const tabs: readonly VerticalTabItem[] = [
    {
      value: 'basic',
      label: 'Basic',
      icon: <GearIcon />,
      content: (
        <BasicForm
          seed={seed}
          onSeedChange={onSeedChange}
          useWorker={useWorker}
          onUseWorkerChange={onUseWorkerChange}
        />
      ),
    },
    {
      value: 'dummy',
      label: 'Dummy',
      icon: <MagicWandIcon />,
      content: <DummyForm />,
    },
  ];

  return (
    <Card size={{ initial: '2', sm: '3' }}>
      <Flex direction='column' gap='4' height='100%'>
        <Heading size='5' color='violet'>
          Map Settings
        </Heading>
        <Separator size='4' />
        <Flex direction='column' flexGrow='1'>
          <VerticalTabs items={tabs} ariaLabel='Generation settings' />
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
