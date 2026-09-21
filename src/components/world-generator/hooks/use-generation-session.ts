import { useCallback } from 'react';

import type { MapRenderer } from '../../../utils/map-renderer';
import { worldGenerationSession } from '../lib/world-generation-session';

export interface GenerationSession {
  onRendererReady: (renderer: MapRenderer | undefined) => void;
}

/** Attaches the preview renderer to the shared generation session. */
export function useGenerationSession(): GenerationSession {
  const onRendererReady = useCallback((renderer: MapRenderer | undefined) => {
    if (renderer) {
      worldGenerationSession.attach(renderer);
    } else {
      worldGenerationSession.detach();
    }
  }, []);

  return { onRendererReady };
}
