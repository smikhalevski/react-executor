import type { ExecutorPlugin } from '../types';

/**
 * Retries the latest task of the active executor if the window gains focus.
 */
export default function retryFocused(): ExecutorPlugin {
  return plugin;
}

const plugin: ExecutorPlugin = executor => {
  if (typeof window === 'undefined') {
    return;
  }

  const handleFocus = () => {
    if (window.document.visibilityState === 'visible' && executor.isActive) {
      executor.retry();
    }
  };

  window.addEventListener('visibilitychange', handleFocus, false);
  window.addEventListener('focus', handleFocus, false);

  executor.subscribe(event => {
    if (event.type === 'disposed') {
      window.removeEventListener('visibilitychange', handleFocus, false);
      window.removeEventListener('focus', handleFocus, false);
    }
  });
};
