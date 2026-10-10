import { createContext, type ReactNode, useContext, useState } from 'react';

interface HeaderActions {
  /** Whether the mounted preview can be shown fullscreen; registered by the preview. */
  canFullscreen: boolean;
  setCanFullscreen: (can: boolean) => void;
  isFullscreen: boolean;
  setIsFullscreen: (fullscreen: boolean) => void;
}

export const HeaderActionsContext = createContext<HeaderActions>({
  canFullscreen: false,
  setCanFullscreen: () => {},
  isFullscreen: false,
  setIsFullscreen: () => {},
});

export function useHeaderActions() {
  return useContext(HeaderActionsContext);
}

export function HeaderActionsProvider({ children }: { children: ReactNode }) {
  const [canFullscreen, setCanFullscreen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  return (
    <HeaderActionsContext.Provider
      value={{ canFullscreen, setCanFullscreen, isFullscreen, setIsFullscreen }}
    >
      {children}
    </HeaderActionsContext.Provider>
  );
}
