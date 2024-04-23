import type { Plugin } from '../types';

/**
 * Retries the last task if window gains focused.
 */
export default function focusPlugin(): Plugin {
  return executor => {
    if (typeof window === 'undefined') {
      return;
    }

    const handleFocus = () => {
      if (document.visibilityState === 'visible') {
        executor.retry();
      }
    };

    window.addEventListener('visibilitychange', handleFocus, false);
    window.addEventListener('focus', handleFocus, false);

    return () => {
      window.removeEventListener('visibilitychange', handleFocus, false);
      window.removeEventListener('focus', handleFocus, false);
    };
  };
}
