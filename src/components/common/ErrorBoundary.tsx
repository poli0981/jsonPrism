import { Component, type ErrorInfo, type ReactNode } from 'react';

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
      return (
        <div className="bg-background text-foreground flex min-h-screen items-center justify-center p-8">
          <div className="border-border bg-card max-w-md rounded-lg border p-6">
            <h1 className="font-display mb-2 text-2xl">Something refracted unexpectedly.</h1>
            <p className="text-muted-foreground mb-4 text-sm">
              {this.state.error?.message ?? 'Unknown error.'}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium transition hover:opacity-90"
            >
              Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
