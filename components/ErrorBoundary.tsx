"use client";

import React from "react";

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Error Boundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div style={{
          padding: "2rem",
          maxWidth: "600px",
          margin: "2rem auto",
          backgroundColor: "#fee",
          border: "1px solid #c00",
          borderRadius: "8px",
        }}>
          <h2 style={{ color: "#c00", marginTop: 0 }}>Something went wrong</h2>
          <p>
            An unexpected error occurred. Please try refreshing the page.
          </p>
          <details style={{ marginTop: "1rem", cursor: "pointer" }}>
            <summary style={{ fontWeight: "bold" }}>Error details</summary>
            <pre style={{
              padding: "1rem",
              backgroundColor: "#fff",
              border: "1px solid #ccc",
              borderRadius: "4px",
              overflow: "auto",
              fontSize: "0.875rem",
            }}>
              {this.state.error?.toString()}
              {"\n"}
              {this.state.error?.stack}
            </pre>
          </details>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: "1rem",
              padding: "0.5rem 1rem",
              backgroundColor: "#c00",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            Refresh Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
