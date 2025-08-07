/**
 * Tooling for SSR implementation that supports executor hydration on the client.
 *
 * ```ts
 * import { SSRExecutorManager } from 'react-executor/ssr';
 * ```
 *
 * @module ssr
 */

export { WebSSRExecutorManager } from './WebSSRExecutorManager.js';
export { SSRExecutorManager } from './SSRExecutorManager.js';

export type { SSRExecutorManagerOptions } from './SSRExecutorManager.js';
