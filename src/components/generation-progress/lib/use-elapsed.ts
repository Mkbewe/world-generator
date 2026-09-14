import { useEffect, useState } from 'react';

import type { GenerationProgressState } from './progress-types';

/** Wall-clock time since the component started, ticking while the run is active. */
export function useElapsed(status: GenerationProgressState['status']): number {
  const [startedAt] = useState(() => performance.now());
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (status !== 'running') {
      return;
    }
    const id = setInterval(() => setElapsed(performance.now() - startedAt), 100);
    return () => clearInterval(id);
  }, [status, startedAt]);

  return elapsed;
}
