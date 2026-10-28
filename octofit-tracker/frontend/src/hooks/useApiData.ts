import { type DependencyList, useEffect, useState } from 'react';

export type ApiState<T> =
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: Error };

export function useApiData<T>(load: () => Promise<T>, deps: DependencyList): ApiState<T> {
  const [state, setState] = useState<ApiState<T>>({ status: 'loading' });
  useEffect(() => {
    let active = true;
    setState({ status: 'loading' });
    load().then(
      (data) => { if (active) setState({ status: 'success', data }); },
      (error: unknown) => { if (active) setState({ status: 'error', error: error instanceof Error ? error : new Error(String(error)) }); },
    );
    return () => { active = false; };
  }, deps);
  return state;
}
