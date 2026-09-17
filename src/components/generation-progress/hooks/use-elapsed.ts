import { useEffect, useState } from 'react';

import type { GenerationProgressState } from '../lib/progress-types';

/** Wall-clock time since the run started, ticking while the run is active. */
export function useElapsed(status: GenerationProgressState['status'], startedAt?: number): number {
  const [mountedAt] = useState(() => performance.now());
  const [now, setNow] = useState(() => performance.now());
  const start = startedAt ?? mountedAt;

  useEffect(() => {
    if (status !== 'running') {
      return;
    }
    const id = setInterval(() => setNow(performance.now()), 100);
    return () => clearInterval(id);
  }, [status]);

  return Math.max(0, now - start);
}
