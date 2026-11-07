import { useTranslation } from 'react-i18next';
import { Button, Flex, Text, TextField } from '@radix-ui/themes';

interface GeneralFormProps {
  seed: string;
  onSeedChange: (seed: string) => void;
}

export function GeneralForm({ seed, onSeedChange }: GeneralFormProps) {
  const { t } = useTranslation();
  const randomizeSeed = (): void => {
    onSeedChange(
      Math.floor(Math.random() * 1_000_000)
        .toString()
        .padStart(6, '0')
    );
  };

  return (
    <Flex direction='column' gap='2'>
      <Text as='label' htmlFor='general-form-seed-input' size='3' color='gray'>
        {t('forms.general.seed')}
      </Text>
      <Flex gap='2'>
        <TextField.Root
          id='general-form-seed-input'
          value={seed}
          onChange={event => onSeedChange(event.target.value)}
          size='3'
          style={{ flexGrow: 1 }}
        />
        <Button variant='soft' size='3' onClick={randomizeSeed}>
          {t('forms.general.randomize')}
        </Button>
      </Flex>
    </Flex>
  );
}
