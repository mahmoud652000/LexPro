import React from 'react';

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error('❌ React Error Boundary:', error, info);
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 40, textAlign: 'center' }}>
          <h2 style={{ color: '#c0392b' }}>حدث خطأ غير متوقع</h2>
          <p style={{ color: '#999', fontSize: 13, marginTop: 8 }}>
            {this.state.error?.message}
          </p>
          <button
            onClick={() => this.setState({ hasError: false })}
            style={{
              marginTop: 16,
              padding: '8px 20px',
              borderRadius: 6,
              border: 'none',
              background: '#27ae60',
              color: '#fff',
              cursor: 'pointer',
            }}
          >
            إعادة المحاولة
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
