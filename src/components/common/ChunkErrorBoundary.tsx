import { Component, type ErrorInfo, type ReactNode } from 'react';
import { ChunkErrorFallback } from '@/components/common/ChunkErrorFallback';
import { isChunkLoadError } from '@/lib/chunk-error';

interface Props {
  children: ReactNode;
  /** Rendered instead of the default panel on a chunk error (e.g. a textarea editor). */
  fallback?: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Catches failed lazy `import()` loads and degrades gracefully. Non-chunk errors
 * are rethrown so the outer crash {@link ErrorBoundary} handles them instead.
 */
export class ChunkErrorBoundary extends Component<Props, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    if (isChunkLoadError(error)) {
      console.error('JSONPrism chunk-load error:', error, info);
    }
  }

  override render(): ReactNode {
    const { error } = this.state;
    if (error) {
      if (isChunkLoadError(error)) {
        return this.props.fallback ?? <ChunkErrorFallback />;
      }
      // Not ours — let an outer boundary deal with it.
      throw error;
    }
    return this.props.children;
  }
}
