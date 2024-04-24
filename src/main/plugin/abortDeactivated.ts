import type { ExecutorPlugin } from '../types';

/**
 * Instantly aborts pending task when executor is deactivated.
 */
export default function abortDeactivated(): ExecutorPlugin {
  return plugin;
}

const plugin: ExecutorPlugin = executor => {
  executor.subscribe(event => {
    if (event.type === 'deactivated') {
      executor.abort();
    }
  });
};
