/**
 * Returns a promise that is resolved with the value after the timeout. Uses the global `setTimeout`, so it respects
 * fake timers.
 */
export function sleep<TValue = void>(ms: number, value?: TValue): Promise<TValue> {
  return new Promise(resolve => {
    setTimeout(() => resolve(value!), ms);
  });
}
