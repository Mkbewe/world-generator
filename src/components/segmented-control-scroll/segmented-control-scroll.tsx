import type { ReactNode } from 'react';

import styles from './segmented-control-scroll.module.scss';

interface SegmentedControlScrollProps {
  children: ReactNode;
}

/** Keeps a segmented control on one row and scrolls it inside narrow forms. */
export function SegmentedControlScroll({ children }: SegmentedControlScrollProps) {
  return <div className={styles.scroll}>{children}</div>;
}
