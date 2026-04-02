import { Component, type ReactNode, type ErrorInfo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RotateCcw } from "lucide-react";

type Props = {
  children: ReactNode;
  /** Label shown in the error UI so the user knows which section failed. */
  section?: string;
  /** Compact mode hides the detail text — use for smaller sections like sidebars. */
  compact?: boolean;
};

type State = {
  hasError: boolean;
  error: Error | null;
};

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[ErrorBoundary${this.props.section ? `: ${this.props.section}` : ""}]`, error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    if (this.props.compact) {
      return (
        <div className="flex flex-col items-center justify-center gap-2 p-4 text-center">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          <p className="text-xs text-muted-foreground">
            {this.props.section || "This section"} failed to load.
          </p>
          <Button variant="ghost" size="sm" onClick={this.handleReset} className="gap-1 text-xs">
            <RotateCcw className="h-3 w-3" /> Retry
          </Button>
        </div>
      );
    }

    return (
      <Card className="border-destructive/30 m-4">
        <CardContent className="py-10 text-center space-y-3">
          <AlertTriangle className="h-10 w-10 text-amber-500 mx-auto" />
          <h3 className="text-lg font-semibold">Something went wrong</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            {this.props.section ? `The ${this.props.section} section` : "Part of this page"} encountered an error.
            Your data is safe — try refreshing or click below to retry.
          </p>
          {this.state.error && (
            <p className="text-xs text-muted-foreground font-mono bg-muted p-2 rounded max-w-md mx-auto truncate">
              {this.state.error.message}
            </p>
          )}
          <div className="flex gap-2 justify-center pt-2">
            <Button variant="outline" onClick={this.handleReset} className="gap-2">
              <RotateCcw className="h-4 w-4" /> Try Again
            </Button>
            <Button onClick={() => window.location.reload()}>
              Refresh Page
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }
}
