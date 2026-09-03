"use client";

import React, { Component, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("[ErrorBoundary] Render error caught:", error, errorInfo);
  }

  handleReset = () => {
    // Clear React Query cache to force fresh data
    try {
      const queryClient = (window as any).__REACT_QUERY_CLIENT__;
      if (queryClient) {
        queryClient.clear();
      }
    } catch { /* noop */ }

    // Clear any stale persisted state
    try {
      if (typeof window !== "undefined") {
        sessionStorage.removeItem("pos-cart");
      }
    } catch { /* noop */ }

    this.setState({ hasError: false, error: null });
    // Force full reload to re-hydrate from server
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-background p-4">
          <div className="w-full max-w-md space-y-6 text-center">
            <div className="flex justify-center">
              <div className="rounded-full bg-destructive/10 p-4">
                <AlertTriangle className="h-10 w-10 text-destructive" />
              </div>
            </div>
            <div className="space-y-2">
              <h1 className="text-xl font-bold text-foreground">
                {this.props.fallbackTitle || "Algo salio mal"}
              </h1>
              <p className="text-sm text-muted-foreground">
                {this.props.fallbackMessage ||
                  "La aplicacion encontró un error inesperado. Puedes intentar recargar para continuar."}
              </p>
            </div>
            {this.state.error && (
              <div className="rounded-md bg-muted p-3 text-left text-xs text-muted-foreground overflow-auto max-h-32">
                <code>{this.state.error.message}</code>
              </div>
            )}
            <div className="flex flex-col gap-2">
              <Button onClick={this.handleReset} className="w-full" size="lg">
                <RefreshCw className="mr-2 h-4 w-4" />
                Recargar Aplicacion
              </Button>
              <Button
                variant="ghost"
                onClick={() => (window.location.href = "/")}
                className="w-full"
              >
                Ir al Inicio
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
