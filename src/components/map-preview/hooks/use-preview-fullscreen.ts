import { useEffect } from 'react';

import { useEscapeKey } from '../../../hooks/use-escape-key';
import { useHeaderActions } from '../../header';

const MOBILE_VIEWPORT_QUERY = '(width < 768px)';

/** Keeps the header fullscreen flag in sync with the mounted preview. */
export function usePreviewFullscreen(): boolean {
  const { isFullscreen, setIsFullscreen, setCanFullscreen } = useHeaderActions();

  useEffect(() => {
    setCanFullscreen(true);
    return () => {
      setCanFullscreen(false);
      setIsFullscreen(false);
    };
  }, [setCanFullscreen, setIsFullscreen]);

  useEffect(() => {
    const query = window.matchMedia(MOBILE_VIEWPORT_QUERY);
    const exitOnMobile = (matches: boolean): void => {
      if (matches) {
        setIsFullscreen(false);
      }
    };
    exitOnMobile(query.matches);
    const handleChange = (event: MediaQueryListEvent): void => exitOnMobile(event.matches);
    query.addEventListener('change', handleChange);
    return () => query.removeEventListener('change', handleChange);
  }, [setIsFullscreen]);

  useEscapeKey(isFullscreen, () => setIsFullscreen(false));

  useEffect(() => {
    if (!isFullscreen) {
      return;
    }
    const root = document.documentElement;
    const previousOverflow = root.style.overflow;
    root.style.overflow = 'hidden';
    return () => {
      root.style.overflow = previousOverflow;
    };
  }, [isFullscreen]);

  return isFullscreen;
}
