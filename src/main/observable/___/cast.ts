import { Observable } from '../../types.js';

export function cast<I, O>(observable: Observable<I>, caster: (value: I) => O): Observable<O> {
  return {
    subscribe: listener => observable.subscribe(value => listener(caster(value))),
  };
}
