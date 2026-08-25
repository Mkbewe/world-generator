import { Button, Card, Flex, Heading, Separator, Switch, Text, TextField } from '@radix-ui/themes';

interface GenerationFormProps {
  seed: string;
  onSeedChange: (seed: string) => void;
  useWorker: boolean;
  onUseWorkerChange: (useWorker: boolean) => void;
  isGenerating: boolean;
  onGenerate: () => void;
}

export function GenerationForm({
  seed,
  onSeedChange,
  useWorker,
  onUseWorkerChange,
  isGenerating,
  onGenerate,
}: GenerationFormProps) {
  return (
    <Card size={{ initial: '2', sm: '3' }}>
      <Flex direction='column' gap='4'>
        <Heading size='5' color='violet'>
          Settings
        </Heading>
        <Separator size='4' />
        <Flex direction='column' gap='2'>
          <Text as='label' htmlFor='pipeline-seed-input' size='2' color='gray'>
            Seed:
          </Text>
          <TextField.Root
            id='pipeline-seed-input'
            value={seed}
            onChange={event => onSeedChange(event.target.value)}
          />
          <Flex align='center' justify='between' gap='2'>
            <Text as='label' htmlFor='pipeline-use-worker' size='2'>
              Generate in a worker
            </Text>
            <Switch
              id='pipeline-use-worker'
              checked={useWorker}
              onCheckedChange={onUseWorkerChange}
            />
          </Flex>
          <Button onClick={onGenerate} disabled={isGenerating}>
            {isGenerating ? 'Generating...' : 'Generate noise'}
          </Button>
        </Flex>
      </Flex>
    </Card>
  );
}
