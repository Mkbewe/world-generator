import { createContext, type ReactNode, type RefObject, useContext, useRef } from 'react';

interface HeaderActions {
  exportMapRef: RefObject<(() => void) | undefined>;
}

export const HeaderActionsContext = createContext<HeaderActions>({
  exportMapRef: { current: undefined },
});

export function useHeaderActions() {
  return useContext(HeaderActionsContext);
}

export function HeaderActionsProvider({ children }: { children: ReactNode }) {
  const exportMapRef = useRef<(() => void) | undefined>(undefined);

  return (
    <HeaderActionsContext.Provider value={{ exportMapRef }}>
      {children}
    </HeaderActionsContext.Provider>
  );
}
