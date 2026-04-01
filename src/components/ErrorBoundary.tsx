import React from "react";

type ErrorBoundaryProps = {
  children: React.ReactNode;
};

type ErrorBoundaryState = {
  hasError: boolean;
  errorMessage: string;
  errorStack: string;
  componentStack: string;
};

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      errorMessage: "",
      errorStack: "",
      componentStack: "",
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      errorMessage: error?.message || "Erro inesperado na interface.",
      errorStack: error?.stack || "",
    };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    this.setState({
      componentStack: info?.componentStack || "",
    });

    console.error("[ErrorBoundary] Erro capturado:", error);
    console.error("[ErrorBoundary] Pilha de componentes:", info?.componentStack);
  }

  private handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
          <div className="w-full max-w-3xl rounded-lg border bg-card p-6 shadow-sm space-y-4">
            <h1 className="text-2xl font-semibold">Erro na aplicacao</h1>
            <p className="text-sm text-muted-foreground">
              O sistema encontrou um erro inesperado e nao conseguiu renderizar
              esta tela.
            </p>

            <div className="rounded-md bg-destructive/10 border border-destructive/30 p-3">
              <p className="text-sm font-medium text-destructive">
                {this.state.errorMessage}
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Detalhes tecnicos</p>
              <pre className="text-xs whitespace-pre-wrap break-words max-h-64 overflow-auto rounded-md bg-muted p-3">
                {this.state.errorStack || "Sem stack trace disponivel."}
                {this.state.componentStack
                  ? `\n\nComponent stack:\n${this.state.componentStack}`
                  : ""}
              </pre>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={this.handleReload}
                className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-primary-foreground text-sm hover:opacity-90"
              >
                Recarregar pagina
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

