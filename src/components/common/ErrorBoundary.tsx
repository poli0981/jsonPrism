import { Component, type ErrorInfo, type ReactNode } from 'react';
import { ErrorState, errorActionPrimary } from '@/components/common/ErrorState';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  override state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('JSONPrism error boundary caught:', error, info);
  }

  override render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      // Last-resort crash screen. Intentionally hardcoded English (no i18n) so
      // it still renders even when the crash originated inside i18n itself.
      return (
        <ErrorState
          className="min-h-dvh"
          title="Something refracted unexpectedly."
          message={this.state.error?.message ?? 'Unknown error.'}
          actions={
            <button
              type="button"
              onClick={() => window.location.reload()}
              className={errorActionPrimary}
            >
              Reload
            </button>
          }
        />
      );
    }
    return this.props.children;
  }
}
