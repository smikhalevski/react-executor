const typescript = require('@rollup/plugin-typescript');

module.exports = {
  input: [
    './src/main/observable/navigatorOffline.ts',
    './src/main/observable/navigatorOnline.ts',
    './src/main/observable/not.ts',
    './src/main/observable/windowBlurred.ts',
    './src/main/observable/windowFocused.ts',

    './src/main/plugin/abortDeactivated.ts',
    './src/main/plugin/abortPendingAfter.ts',
    './src/main/plugin/abortWhen.ts',
    './src/main/plugin/bindAll.ts',
    './src/main/plugin/detachDeactivated.ts',
    './src/main/plugin/detachInactive.ts',
    './src/main/plugin/invalidateAfter.ts',
    './src/main/plugin/invalidateByPeers.ts',
    './src/main/plugin/invalidatePeers.ts',
    './src/main/plugin/rejectPendingAfter.ts',
    './src/main/plugin/resolveBy.ts',
    './src/main/plugin/retryActivated.ts',
    './src/main/plugin/retryFulfilled.ts',
    './src/main/plugin/retryInvalidated.ts',
    './src/main/plugin/retryRejected.ts',
    './src/main/plugin/retryWhen.ts',
    './src/main/plugin/synchronizeStorage.ts',

    './src/main/ssr/node/index.ts',
    './src/main/ssr/index.ts',

    './src/main/core.ts',
    './src/main/index.ts',
  ],
  output: [
    { format: 'cjs', entryFileNames: '[name].js', dir: './lib', preserveModules: true },
    { format: 'es', entryFileNames: '[name].mjs', dir: './lib', preserveModules: true },
  ],
  plugins: [typescript({ tsconfig: './tsconfig.build.json' })],
  external: ['react', 'parallel-universe', 'stream'],
};
