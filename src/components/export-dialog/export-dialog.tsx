import { useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertDialog, Button, Flex, RadioCards, Text } from '@radix-ui/themes';

/** One format the dialog can export; the caller turns the chosen id into a file. */
export interface ExportFormatOption {
  readonly id: string;
  readonly label: string;
  readonly description?: string;
}

interface ExportDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  formats: readonly ExportFormatOption[];
  onExport: (formatId: string) => void;
}

export function ExportDialog({
  isOpen,
  onOpenChange,
  title,
  description,
  formats,
  onExport,
}: ExportDialogProps) {
  const [selected, setSelected] = useState(formats[0]?.id ?? '');

  return createPortal(
    <AlertDialog.Root open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialog.Content maxWidth='450px'>
        <AlertDialog.Title>{title}</AlertDialog.Title>
        {description && <AlertDialog.Description>{description}</AlertDialog.Description>}
        {formats.length > 1 && (
          <RadioCards.Root
            columns='1'
            gap='2'
            size='1'
            mt='3'
            value={selected}
            onValueChange={setSelected}
          >
            {formats.map(format => (
              <RadioCards.Item key={format.id} value={format.id}>
                <Flex direction='column' gap='1'>
                  <Text size='2' weight='bold'>
                    {format.label}
                  </Text>
                  {format.description && (
                    <Text size='1' color='gray'>
                      {format.description}
                    </Text>
                  )}
                </Flex>
              </RadioCards.Item>
            ))}
          </RadioCards.Root>
        )}
        <Flex gap='3' mt='4' justify='end'>
          <AlertDialog.Cancel>
            <Button variant='soft' color='gray'>
              Cancel
            </Button>
          </AlertDialog.Cancel>
          <AlertDialog.Action>
            <Button variant='solid' onClick={() => onExport(selected)}>
              Export
            </Button>
          </AlertDialog.Action>
        </Flex>
      </AlertDialog.Content>
    </AlertDialog.Root>,
    document.body
  );
}
