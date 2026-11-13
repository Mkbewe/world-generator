import type { ReactNode } from 'react';
import { Box, Flex } from '@radix-ui/themes';

import type { Color } from '../../utils/map-layers';
import { colorString } from '../lib/color';
import styles from './editor-card-header.module.scss';

interface EditorCardHeaderProps {
  color: Color;
  children: ReactNode;
  actions: ReactNode;
}

/** Swatch, title or name field, and action slot shared by selected-item cards. */
export function EditorCardHeader({ color, children, actions }: EditorCardHeaderProps) {
  return (
    <Flex gap='2' align='center'>
      <Box aria-hidden className={styles.swatch} style={{ backgroundColor: colorString(color) }} />
      <Box className={styles.content}>{children}</Box>
      <Flex gap='1' align='center'>
        {actions}
      </Flex>
    </Flex>
  );
}
