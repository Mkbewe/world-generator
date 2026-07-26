import type { ReactNode } from 'react';

import { Footer } from '../footer';
import { Header } from '../header';
import styles from './layout.module.css';

interface LayoutProps {
  children: ReactNode;
  onExportMap?: () => void;
  onToggleTheme?: () => void;
  currentTheme?: 'light' | 'dark';
}

export function Layout({ children, onExportMap, onToggleTheme, currentTheme }: LayoutProps) {
  return (
    <div className={styles.layout}>
      <Header onExportMap={onExportMap} onToggleTheme={onToggleTheme} currentTheme={currentTheme} />
      <main className={styles.main}>{children}</main>
      <Footer />
    </div>
  );
}
