import React from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    // Error is already captured by getDerivedStateFromError
    // In production, this would be sent to error tracking service
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex min-h-[400px] items-center justify-center p-6">
          <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
            <h2 className="mb-2 text-lg font-semibold text-foreground">Something went wrong</h2>
            <p className="mb-4 text-sm text-muted-foreground">
              An unexpected error occurred. Please try reloading the page.
            </p>
            {this.state.error && (
              <details className="mb-4 text-left">
                <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
                  Error details
                </summary>
                <pre className="mt-2 max-h-32 overflow-auto rounded bg-muted p-2 text-xs">
                  {this.state.error.message}
                </pre>
              </details>
            )}
            <div className="flex justify-center gap-2">
              <Button variant="outline" size="sm" onClick={this.handleReset}>
                Try again
              </Button>
              <Button size="sm" onClick={this.handleReload}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Reload page
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
