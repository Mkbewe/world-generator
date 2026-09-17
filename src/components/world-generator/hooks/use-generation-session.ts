import { type RefObject, useCallback, useRef } from 'react';

import type { MapRenderer } from '../../../utils/map-renderer';
import { WorldGenerationSession } from '../lib/world-generation-session';

export interface GenerationSession {
  sessionRef: RefObject<WorldGenerationSession | null>;
  onRendererReady: (renderer: MapRenderer | undefined) => void;
}

/** Owns the generation session attached to the preview renderer. */
export function useGenerationSession(): GenerationSession {
  const sessionRef = useRef<WorldGenerationSession | null>(null);

  const onRendererReady = useCallback((renderer: MapRenderer | undefined) => {
    sessionRef.current?.cancel();
    sessionRef.current = renderer ? new WorldGenerationSession(renderer) : null;
    sessionRef.current?.restore();
  }, []);

  return { sessionRef, onRendererReady };
}
