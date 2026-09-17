import { Outlet } from 'react-router';

import { Breadcrumbs } from '../../components/breadcrumbs';
import { ExportDialog } from '../../components/export-dialog';
import { Footer } from '../../components/footer';
import { Header, HeaderActionsProvider, useHeaderActions } from '../../components/header';
import { Navigation } from '../../components/navigation';
import { PageSection } from '../../components/page-section';
import { useFlag } from '../../feature-flags';
import { useTheme } from '../../theme';
import styles from './main-layout.module.scss';

function MainLayoutContent() {
  const { isExportDialogOpen, setIsExportDialogOpen, confirmExport, isFullscreen } =
    useHeaderActions();
  const { appearance, toggleTheme } = useTheme();
  const showBreadcrumbs = useFlag('breadcrumbs');

  return (
    <>
      <div className={styles.layout} data-fullscreen={isFullscreen || undefined}>
        <Header onToggleTheme={toggleTheme} currentTheme={appearance} />
        {showBreadcrumbs && (
          <PageSection p='small' pb='none' inert={isFullscreen || undefined}>
            <Breadcrumbs />
          </PageSection>
        )}
        <Navigation inert={isFullscreen} />
        <PageSection as='main' p='large' pt='medium'>
          <Outlet />
        </PageSection>
        <Footer inert={isFullscreen} />
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
