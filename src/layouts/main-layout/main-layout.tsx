import { Outlet } from 'react-router';

import { ExportDialog } from '../../components/export-dialog';
import { Footer } from '../../components/footer';
import { Header, HeaderActionsProvider, useHeaderActions } from '../../components/header';
import { PageSection } from '../../components/page-section';
import { useTheme } from '../../theme';
import styles from './main-layout.module.scss';

function MainLayoutContent() {
  const { isExportDialogOpen, setIsExportDialogOpen, confirmExport } = useHeaderActions();
  const { appearance, toggleTheme } = useTheme();

  return (
    <>
      <div className={styles.layout}>
        <Header onToggleTheme={toggleTheme} currentTheme={appearance} />
        <PageSection as='main' padding='large'>
          <Outlet />
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

export function MainLayout() {
  return (
    <HeaderActionsProvider>
      <MainLayoutContent />
    </HeaderActionsProvider>
  );
}
