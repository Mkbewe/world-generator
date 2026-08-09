import { createContext, type ReactNode, type RefObject, useContext, useRef, useState } from 'react';

interface HeaderActions {
  exportMapRef: RefObject<(() => void) | undefined>;
  isExportDialogOpen: boolean;
  setIsExportDialogOpen: (open: boolean) => void;
  confirmExport: () => void;
  isMapGenerated: boolean;
  setIsMapGenerated: (generated: boolean) => void;
}

export const HeaderActionsContext = createContext<HeaderActions>({
  exportMapRef: { current: undefined },
  isExportDialogOpen: false,
  setIsExportDialogOpen: () => {},
  confirmExport: () => {},
  isMapGenerated: false,
  setIsMapGenerated: () => {},
});

export function useHeaderActions() {
  return useContext(HeaderActionsContext);
}

export function HeaderActionsProvider({ children }: { children: ReactNode }) {
  const exportMapRef = useRef<(() => void) | undefined>(undefined);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [isMapGenerated, setIsMapGenerated] = useState(false);

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
      }}
    >
      {children}
    </HeaderActionsContext.Provider>
  );
}
