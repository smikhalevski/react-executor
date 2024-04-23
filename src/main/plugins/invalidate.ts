import type { Plugin } from '../types';

/**
 * Marks settled executor as invalidated after the given timeout.
 */
export default function invalidatePlugin(ms: number): Plugin {
  return executor => {
    let timer: NodeJS.Timeout;

    const doInvalidate = executor.invalidate.bind(executor);

    if (executor.isSettled) {
      setTimeout(doInvalidate, ms);
    }

    const unsubscribe = executor.subscribe(event => {
      if (event.type === 'fulfilled' || event.type === 'rejected') {
        clearTimeout(timer);
        timer = setTimeout(doInvalidate, ms);
      }
    });

    return () => {
      clearTimeout(timer);
      unsubscribe();
    };
  };
}
