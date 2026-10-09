/**
 * Hands the browser a turn between painted stripes, so a large frame never
 * blocks the main thread for its whole duration.
 */
export function createYieldToBrowser(): () => Promise<void> {
  if (typeof MessageChannel === 'undefined') {
    return () => new Promise(resolve => setTimeout(resolve, 0));
  }
  const channel = new MessageChannel();
  const resolvers: (() => void)[] = [];
  channel.port1.onmessage = () => resolvers.shift()?.();
  channel.port1.start();
  return () =>
    new Promise(resolve => {
      resolvers.push(resolve);
      channel.port2.postMessage(undefined);
    });
}

export const yieldToBrowser = createYieldToBrowser();
