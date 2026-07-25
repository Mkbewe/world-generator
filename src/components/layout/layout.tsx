import type { ReactNode } from 'react';

import { Header } from '../header';
import styles from './layout.module.css';

interface LayoutProps {
  children: ReactNode;
  onExportMap?: () => void;
}

export function Layout({ children, onExportMap }: LayoutProps) {
  return (
    <div className={styles.layout}>
      <Header onExportMap={onExportMap} />
      <main className={styles.main}>{children}</main>
    </div>
  );
}
