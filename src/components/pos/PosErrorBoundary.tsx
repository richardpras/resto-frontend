import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

type Props = {
  children: ReactNode;
  /** Optional label for the recovery action. */
  title?: string;
};

type State = {
  hasError: boolean;
  message: string | null;
};

/**
 * Catches render crashes on POS so a white screen is not the only outcome.
 */
export class PosErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: null };

  static getDerivedStateFromError(error: unknown): State {
    const message = error instanceof Error ? error.message : "Something went wrong in POS.";
    return { hasError: true, message };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("POS render error", error, info.componentStack);
  }

  private handleReload = () => {
    this.setState({ hasError: false, message: null });
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="flex flex-col items-center justify-center gap-4 p-8 min-h-[50vh] text-center">
        <h2 className="text-lg font-semibold text-foreground">
          {this.props.title ?? "POS failed to render"}
        </h2>
        <p className="text-sm text-muted-foreground max-w-md">
          {this.state.message ?? "An unexpected error occurred."}
        </p>
        <Button type="button" onClick={this.handleReload}>
          Reload POS
        </Button>
      </div>
    );
  }
}
