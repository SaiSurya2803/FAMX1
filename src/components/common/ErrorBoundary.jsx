import React from 'react';
import './ErrorBoundary.css';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Kinsutra ErrorBoundary caught an unhandled error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="eb-container">
          <div className="eb-chalkboard">
            <div className="eb-frame-border" />
            <div className="eb-icon">🪵 ⚠️</div>
            <h1 className="eb-title">A Chalk Snap Occurred</h1>
            <p className="eb-subtitle">
              Something unexpected halted the blackboard drawing engine. Don't worry, your family data is safe in storage.
            </p>
            {this.state.error?.message && (
              <pre className="eb-error-box">{this.state.error.message}</pre>
            )}
            <div className="eb-actions">
              <button className="eb-btn eb-btn--primary" onClick={this.handleReset}>
                Return to Home Slate
              </button>
              <button className="eb-btn eb-btn--secondary" onClick={() => window.location.reload()}>
                Reload Canvas
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
