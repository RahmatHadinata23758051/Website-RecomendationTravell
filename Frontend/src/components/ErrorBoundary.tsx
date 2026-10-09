import { Component, type ErrorInfo, type ReactNode } from 'react';

export type ErrorLogger = (error: Error, errorInfo: ErrorInfo) => void;

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Optional integration point for an application error-monitoring service. */
  onError?: ErrorLogger;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

/**
 * Keeps rendering errors from taking down the entire application shell.
 * The boundary can be reset without a full page reload after a transient error.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = { hasError: false };

  public static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.props.onError?.(error, errorInfo);
  }

  private handleRetry = (): void => {
    this.setState({ hasError: false });
  };

  public render(): ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <main
        className="flex min-h-[65vh] items-center justify-center px-4 py-16 sm:px-6 lg:px-8"
        role="alert"
        aria-live="assertive"
      >
        <section className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-xl shadow-slate-900/5 sm:p-10">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-2xl text-rose-600" aria-hidden="true">
            !
          </div>
          <h1 className="font-display text-2xl font-extrabold text-slate-900 sm:text-3xl">
            Terjadi kesalahan
          </h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-500 sm:text-base">
            Halaman ini mengalami kendala. Coba muat ulang tampilan untuk melanjutkan perjalanan Anda.
          </p>
          <button
            type="button"
            onClick={this.handleRetry}
            className="mt-7 min-h-11 rounded-full bg-teal-600 px-7 py-3 text-sm font-bold text-white shadow-lg shadow-teal-600/20 transition hover:bg-teal-700 focus:outline-none focus:ring-4 focus:ring-teal-500/20"
          >
            Coba lagi
          </button>
        </section>
      </main>
    );
  }
}
