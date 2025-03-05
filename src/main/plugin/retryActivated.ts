import { ExecutorPlugin } from '../types';

/**
 * Retries the latest task if the executor is activated.
 */
export default function retryActivated(): ExecutorPlugin {
  return plugin;
}

const plugin: ExecutorPlugin = executor => {
  executor.subscribe(event => {
    if (event.type === 'activated') {
      executor.retry();
    }
  });
};
