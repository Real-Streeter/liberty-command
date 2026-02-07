import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#16213e] flex items-center justify-center text-white">
          <div className="text-center px-6">
            <h1 className="text-2xl font-black uppercase italic tracking-tighter mb-2">
              Something went wrong
            </h1>
            <p className="text-zinc-500 text-sm mb-6">
              An unexpected error occurred. Try refreshing the page.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="bg-gradient-to-r from-blue-600 to-blue-500 text-white px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest hover:from-blue-500 hover:to-blue-400 transition-all active:scale-95"
            >
              Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
