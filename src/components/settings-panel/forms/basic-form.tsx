import { Button, Flex, Switch, Text, TextField } from '@radix-ui/themes';

interface BasicFormProps {
  seed: string;
  onSeedChange: (seed: string) => void;
  useWorker: boolean;
  onUseWorkerChange: (useWorker: boolean) => void;
}

export function BasicForm({ seed, onSeedChange, useWorker, onUseWorkerChange }: BasicFormProps) {
  const randomizeSeed = (): void => {
    onSeedChange(
      Math.floor(Math.random() * 1_000_000)
        .toString()
        .padStart(6, '0')
    );
  };

  return (
    <Flex direction='column' gap='2'>
      <Text as='label' htmlFor='basic-form-seed-input' size='3' color='gray'>
        Seed:
      </Text>
      <Flex gap='2'>
        <TextField.Root
          id='basic-form-seed-input'
          value={seed}
          onChange={event => onSeedChange(event.target.value)}
          size='3'
          style={{ flexGrow: 1 }}
        />
        <Button variant='soft' size='3' onClick={randomizeSeed}>
          Randomize
        </Button>
      </Flex>
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
