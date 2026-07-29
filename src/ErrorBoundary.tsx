// @ts-nocheck -- this project has no @types/react for the class-component API (React.Component
// resolves from a stray global type root); functional components elsewhere are unaffected.
import React from 'react';

interface ErrorBoundaryState {
  error: Error | null;
  info: string;
}

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, ErrorBoundaryState> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { error: null, info: '' };
  }

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    this.setState({ info: info.componentStack || '' });
    console.error('App crashed:', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 24, fontFamily: 'monospace', whiteSpace: 'pre-wrap', color: '#DC2626' }}>
          <h2>เกิดข้อผิดพลาด (App crashed)</h2>
          <p>{this.state.error.message}</p>
          <pre>{this.state.error.stack}</pre>
          <pre>{this.state.info}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}
