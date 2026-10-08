import { Component, type ReactNode } from 'react';

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error): void {
    console.error(error);
  }

  render(): ReactNode {
    if (!this.state.error) return this.props.children;
    return (
      <div className="fatal panel" role="alert">
        <h1>Something went wrong</h1>
        <p>The game hit an unexpected problem. You can try again or reset the saved data.</p>
        <button type="button" className="btn btn--primary" onClick={() => this.setState({ error: null })}>
          Try again
        </button>
        <button
          type="button"
          className="btn"
          onClick={() => {
            try {
              ['settings', 'sound', 'theme', 'scoreboard'].forEach((k) => localStorage.removeItem(`caro:${k}`));
            } catch {
              // storage unavailable
            }
            location.reload();
          }}
        >
          Reset saved data
        </button>
      </div>
    );
  }
}
