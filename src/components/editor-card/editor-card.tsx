import type { ReactNode } from 'react';
import { Card, Flex } from '@radix-ui/themes';

interface EditorCardProps {
  children: ReactNode;
}

/** Shared frame for the card that edits the selected map feature. */
export function EditorCard({ children }: EditorCardProps) {
  return (
    <Card size='1' variant='surface'>
      <Flex direction='column' gap='3'>
        {children}
      </Flex>
    </Card>
  );
}
