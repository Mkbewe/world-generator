import { type RefObject, useCallback, useEffect, useRef } from 'react';

import { useHeaderActions } from '../../../../components/header';
import { useEscapeKey } from '../../../../hooks/use-escape-key';

const MOBILE_VIEWPORT_QUERY = '(width < 768px)';

export interface PreviewFullscreen {
  isFullscreen: boolean;
  /** The sidebar trigger, which takes focus back when the mode closes. */
  triggerRef: RefObject<HTMLButtonElement | null>;
  toggleFullscreen: () => void;
}

/** Keeps the fullscreen flag in sync with the preview and owns the sidebar trigger focus. */
export function usePreviewFullscreen(): PreviewFullscreen {
  const { isFullscreen, setIsFullscreen } = useHeaderActions();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const wasFullscreenRef = useRef(false);

  useEffect(() => {
    return () => setIsFullscreen(false);
  }, [setIsFullscreen]);

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

  useEffect(() => {
    if (wasFullscreenRef.current && !isFullscreen) {
      triggerRef.current?.focus();
    }
    wasFullscreenRef.current = isFullscreen;
  }, [isFullscreen]);

  const toggleFullscreen = useCallback((): void => {
    setIsFullscreen(!isFullscreen);
  }, [isFullscreen, setIsFullscreen]);

  return { isFullscreen, triggerRef, toggleFullscreen };
}
