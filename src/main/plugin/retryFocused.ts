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
    if (window.document.visibilityState === 'visible') {
      executor.retry();
    }
  };

  executor.subscribe(event => {
    switch (event.type) {
      case 'activated':
        window.addEventListener('visibilitychange', handleFocus, false);
        window.addEventListener('focus', handleFocus, false);
        break;

      case 'deactivated':
        window.removeEventListener('visibilitychange', handleFocus, false);
        window.removeEventListener('focus', handleFocus, false);
        break;
    }
  });
};
