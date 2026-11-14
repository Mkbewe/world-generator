import { createContext, type ReactNode, useContext, useState } from 'react';

interface HeaderActions {
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
  const [isFullscreen, setIsFullscreen] = useState(false);

  return (
    <HeaderActionsContext.Provider value={{ isFullscreen, setIsFullscreen }}>
      {children}
    </HeaderActionsContext.Provider>
  );
}
