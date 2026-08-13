import type { ReactNode } from 'react';

import { ExportDialog } from '../../components/export-dialog';
import { Footer } from '../../components/footer';
import { Header, HeaderActionsProvider, useHeaderActions } from '../../components/header';
import { PageSection } from '../../components/page-section';
import styles from './main-layout.module.scss';

interface MainLayoutProps {
  children: ReactNode;
  onToggleTheme?: () => void;
  currentTheme?: 'light' | 'dark';
}

function MainLayoutContent({ children, onToggleTheme, currentTheme }: MainLayoutProps) {
  const { isExportDialogOpen, setIsExportDialogOpen, confirmExport } = useHeaderActions();

  return (
    <>
      <div className={styles.layout}>
        <Header onToggleTheme={onToggleTheme} currentTheme={currentTheme} />
        <PageSection as='main' padding='large'>
          {children}
        </PageSection>
        <Footer />
      </div>
      <ExportDialog
        isOpen={isExportDialogOpen}
        onOpenChange={setIsExportDialogOpen}
        onConfirm={confirmExport}
      />
    </>
  );
}

export function MainLayout({ children, onToggleTheme, currentTheme }: MainLayoutProps) {
  return (
    <HeaderActionsProvider>
      <MainLayoutContent onToggleTheme={onToggleTheme} currentTheme={currentTheme}>
        {children}
      </MainLayoutContent>
    </HeaderActionsProvider>
  );
}
