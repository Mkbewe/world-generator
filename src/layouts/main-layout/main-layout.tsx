import type { ReactNode } from 'react';

import { Footer } from '../../components/footer';
import { Header, HeaderActionsProvider } from '../../components/header';
import styles from './main-layout.module.scss';

interface MainLayoutProps {
  children: ReactNode;
  onToggleTheme?: () => void;
  currentTheme?: 'light' | 'dark';
}

export function MainLayout({ children, onToggleTheme, currentTheme }: MainLayoutProps) {
  return (
    <HeaderActionsProvider>
      <div className={styles.layout}>
        <Header onToggleTheme={onToggleTheme} currentTheme={currentTheme} />
        <main className={styles.main}>{children}</main>
        <Footer />
      </div>
    </HeaderActionsProvider>
  );
}
