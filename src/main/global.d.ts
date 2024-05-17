import type { ExecutorPlugin } from './types';

declare global {
  const __REACT_EXECUTOR_DEVTOOLS__: { plugin: ExecutorPlugin } | undefined;

  interface Window {
    __REACT_EXECUTOR_SSR_STATE__?: { push(stateStr: string): void };
  }
}
