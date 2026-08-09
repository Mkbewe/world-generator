import { createPortal } from 'react-dom';
import { AlertDialog, Button, Flex } from '@radix-ui/themes';

interface ExportDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export function ExportDialog({ isOpen, onOpenChange, onConfirm }: ExportDialogProps) {
  return createPortal(
    <AlertDialog.Root open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialog.Content maxWidth='450px'>
        <AlertDialog.Title>Export World Map</AlertDialog.Title>
        <AlertDialog.Description>
          Download the current world map as a PNG image?
        </AlertDialog.Description>
        <Flex gap='3' mt='4' justify='end'>
          <AlertDialog.Cancel>
            <Button variant='soft' color='gray'>
              Cancel
            </Button>
          </AlertDialog.Cancel>
          <AlertDialog.Action>
            <Button variant='solid' onClick={onConfirm}>
              Export
            </Button>
          </AlertDialog.Action>
        </Flex>
      </AlertDialog.Content>
    </AlertDialog.Root>,
    document.body
  );
}
