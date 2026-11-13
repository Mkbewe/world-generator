import { createContext, type ReactNode, useContext, useState } from 'react';

interface HeaderActions {
  /** Whether the mounted preview can be shown fullscreen; registered by the preview. */
  canFullscreen: boolean;
  setCanFullscreen: (can: boolean) => void;
  isFullscreen: boolean;
  setIsFullscreen: (fullscreen: boolean) => void;
}

export const HeaderActionsContext = createContext<HeaderActions | undefined>(undefined);

export function useHeaderActions(): HeaderActions {
  const actions = useContext(HeaderActionsContext);
  if (!actions) {
    throw new Error('useHeaderActions must be used within HeaderActionsProvider.');
  }
  return actions;
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
