import React, { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({
      error,
      errorInfo,
    });

    // Error-Logging (kann erweitert werden)
    console.error('Error Boundary hat einen Fehler abgefangen:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="error-boundary">
          <div className="error-content">
            <h2>🚨 Ein Fehler ist aufgetreten</h2>
            <div className="error-message">
              <strong>Fehler:</strong> {this.state.error?.message}
            </div>
            {this.state.errorInfo && (
              <details className="error-details">
                <summary>Technische Details</summary>
                <pre>{this.state.errorInfo.componentStack}</pre>
              </details>
            )}
            <div className="error-actions">
              <button 
                onClick={this.handleRetry}
                className="btn btn--primary"
              >
                Erneut versuchen
              </button>
              <button 
                onClick={() => window.location.reload()}
                className="btn btn--secondary"
              >
                Seite neu laden
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}