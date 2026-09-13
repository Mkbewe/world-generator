import { useState } from 'react';
import { Flex, Switch, Text, TextField } from '@radix-ui/themes';

export function DummyForm() {
  const [name, setName] = useState('');
  const [enabled, setEnabled] = useState(false);

  return (
    <Flex direction='column' gap='2'>
      <Text as='label' htmlFor='dummy-form-name-input' size='2' color='gray'>
        Name:
      </Text>
      <TextField.Root
        id='dummy-form-name-input'
        value={name}
        placeholder='Placeholder for future settings'
        onChange={event => setName(event.target.value)}
      />
      <Flex align='center' justify='between' gap='2'>
        <Text as='label' htmlFor='dummy-form-enabled' size='2'>
          Enabled
        </Text>
        <Switch id='dummy-form-enabled' checked={enabled} onCheckedChange={setEnabled} />
      </Flex>
    </Flex>
  );
}
