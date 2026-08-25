import { Outlet } from 'react-router';

import { Breadcrumbs } from '../../components/breadcrumbs';
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
        <PageSection p='small' pb='none'>
          <Breadcrumbs />
        </PageSection>
        <PageSection as='main' p='large' pt='small'>
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
