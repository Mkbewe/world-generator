import { type RefObject, useLayoutEffect, useState } from 'react';

export interface ElementSize {
  readonly width: number;
  readonly height: number;
}

/** CSS size of an element, kept in sync with a ResizeObserver when available. */
export function useElementSize(ref: RefObject<HTMLElement | null>): ElementSize {
  const [size, setSize] = useState<ElementSize>({ width: 0, height: 0 });

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) {
      return;
    }
    const measure = (): void => {
      const rect = element.getBoundingClientRect();
      setSize(current =>
        current.width === rect.width && current.height === rect.height
          ? current
          : { width: rect.width, height: rect.height }
      );
    };
    measure();
    if (typeof ResizeObserver === 'undefined') {
      return;
    }
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);

  return size;
}
