// TAIS Platform - Error Boundary Component

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-black flex items-center justify-center p-6">
          <Card className="max-w-2xl w-full bg-[#1a1a1a] border-[#333333] p-8">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <AlertTriangle className="w-12 h-12 text-[#EF4444]" />
              </div>
              <div className="flex-1 space-y-4">
                <div>
                  <h1 className="text-2xl font-bold text-white mb-2">
                    Something went wrong
                  </h1>
                  <p className="text-[#888888]">
                    We encountered an unexpected error. Please try refreshing the page.
                  </p>
                </div>

                {this.state.error && (
                  <div className="bg-[#111111] border border-[#333333] rounded-lg p-4">
                    <h3 className="text-sm font-medium text-white mb-2">Error Details:</h3>
                    <pre className="text-xs text-[#EF4444] overflow-auto max-h-40">
                      {this.state.error.toString()}
                    </pre>
                  </div>
                )}

                {this.state.errorInfo && import.meta.env.DEV && (
                  <details className="bg-[#111111] border border-[#333333] rounded-lg p-4">
                    <summary className="text-sm font-medium text-white cursor-pointer mb-2">
                      Component Stack
                    </summary>
                    <pre className="text-xs text-[#888888] overflow-auto max-h-40">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </details>
                )}

                <div className="flex gap-3">
                  <Button
                    onClick={this.handleReset}
                    className="bg-[#3B82F6] hover:bg-[#2563EB] text-white"
                  >
                    Reload Page
                  </Button>
                  <Button
                    onClick={() => (window.location.href = '/')}
                    variant="outline"
                    className="border-[#333333] text-white hover:bg-[#1a1a1a]"
                  >
                    Go Home
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
