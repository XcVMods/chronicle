import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      let errorMsg = this.state.error?.message || 'Unknown error';
      try {
        const parsed = JSON.parse(errorMsg);
        if (parsed.error) {
          errorMsg = `Firestore Error: ${parsed.error} (Operation: ${parsed.operationType}, Path: ${parsed.path})`;
        }
      } catch (e) {
        // Not JSON
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-amber-500 p-4">
          <div className="bg-zinc-900 p-6 rounded-xl border border-red-500/30 max-w-md w-full">
            <h2 className="text-xl font-bold text-red-500 mb-4">Something went wrong</h2>
            <p className="text-sm text-zinc-300 mb-4">{errorMsg}</p>
            <button
              className="bg-amber-600 hover:bg-amber-500 text-zinc-950 px-4 py-2 rounded font-bold w-full"
              onClick={() => window.location.reload()}
            >
              Reload Game
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
