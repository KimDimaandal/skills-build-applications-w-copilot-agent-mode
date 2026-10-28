import type { ReactNode } from 'react';
import type { ApiState } from '../hooks/useApiData.js';

type Props<T> = {
  state: ApiState<T>;
  resource: string;
  isEmpty: (data: T) => boolean;
  emptyMessage: string;
  errorMessage?: (error: Error) => string;
  children: (data: T) => ReactNode;
};

export function AsyncContent<T>({ state, resource, isEmpty, emptyMessage, errorMessage, children }: Props<T>) {
  if (state.status === 'loading') return <p role="status" className="text-muted">Loading {resource}…</p>;
  if (state.status === 'error') {
    return <div role="alert" className="alert alert-danger mb-0">{errorMessage?.(state.error) ?? `Unable to load ${resource}. Please try again later.`}</div>;
  }
  if (isEmpty(state.data)) return <p className="text-muted mb-0">{emptyMessage}</p>;
  return <>{children(state.data)}</>;
}
