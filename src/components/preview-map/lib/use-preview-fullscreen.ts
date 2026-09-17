import { useEffect } from 'react';

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

  useEffect(() => {
    if (!isFullscreen) {
      return;
    }
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        setIsFullscreen(false);
      }
    };
    const previousOverflow = document.body.style.overflow;
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isFullscreen, setIsFullscreen]);

  return isFullscreen;
}
