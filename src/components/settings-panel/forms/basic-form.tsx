import { Flex, Switch, Text, TextField } from '@radix-ui/themes';

interface BasicFormProps {
  seed: string;
  onSeedChange: (seed: string) => void;
  useWorker: boolean;
  onUseWorkerChange: (useWorker: boolean) => void;
}

export function BasicForm({ seed, onSeedChange, useWorker, onUseWorkerChange }: BasicFormProps) {
  return (
    <Flex direction='column' gap='2'>
      <Text as='label' htmlFor='basic-form-seed-input' size='3' color='gray'>
        Seed:
      </Text>
      <TextField.Root
        id='basic-form-seed-input'
        value={seed}
        onChange={event => onSeedChange(event.target.value)}
        size='3'
      />
      <Flex align='center' justify='between' gap='2'>
        <Text as='label' htmlFor='basic-form-use-worker' size='2'>
          Generate in a worker
        </Text>
        <Switch
          id='basic-form-use-worker'
          checked={useWorker}
          onCheckedChange={onUseWorkerChange}
        />
      </Flex>
    </Flex>
  );
}
