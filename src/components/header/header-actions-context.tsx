import { createContext, type ReactNode, type RefObject, useContext, useRef, useState } from 'react';

interface HeaderActions {
  exportMapRef: RefObject<(() => void) | undefined>;
  isExportDialogOpen: boolean;
  setIsExportDialogOpen: (open: boolean) => void;
  confirmExport: () => void;
  isMapGenerated: boolean;
  setIsMapGenerated: (generated: boolean) => void;
  /** Whether the mounted preview can be shown fullscreen; registered by the preview. */
  canFullscreen: boolean;
  setCanFullscreen: (can: boolean) => void;
  isFullscreen: boolean;
  setIsFullscreen: (fullscreen: boolean) => void;
}

export const HeaderActionsContext = createContext<HeaderActions>({
  exportMapRef: { current: undefined },
  isExportDialogOpen: false,
  setIsExportDialogOpen: () => {},
  confirmExport: () => {},
  isMapGenerated: false,
  setIsMapGenerated: () => {},
  canFullscreen: false,
  setCanFullscreen: () => {},
  isFullscreen: false,
  setIsFullscreen: () => {},
});

export function useHeaderActions() {
  return useContext(HeaderActionsContext);
}

export function HeaderActionsProvider({ children }: { children: ReactNode }) {
  const exportMapRef = useRef<(() => void) | undefined>(undefined);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [isMapGenerated, setIsMapGenerated] = useState(false);
  const [canFullscreen, setCanFullscreen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const confirmExport = () => {
    exportMapRef.current?.();
    setIsExportDialogOpen(false);
  };

  return (
    <HeaderActionsContext.Provider
      value={{
        exportMapRef,
        isExportDialogOpen,
        setIsExportDialogOpen,
        confirmExport,
        isMapGenerated,
        setIsMapGenerated,
        canFullscreen,
        setCanFullscreen,
        isFullscreen,
        setIsFullscreen,
      }}
    >
      {children}
    </HeaderActionsContext.Provider>
  );
}
