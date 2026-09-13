import React from 'react';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Mother Dairy Portal caught an unhandled error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#f4f8f2] flex flex-col items-center justify-center p-6 text-center font-sans">
          <div className="bg-white p-8 sm:p-10 rounded-3xl border border-[#a0c396]/40 shadow-xl max-w-lg w-full space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-white shadow-sm border border-[#a0c396]/40 p-2 mx-auto flex items-center justify-center">
              <img src="/logo.png" alt="Mother Dairy" className="w-full h-full object-contain" />
            </div>

            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 border border-amber-200 rounded-full text-[11px] font-bold text-amber-800 uppercase tracking-wider mb-2">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Interface Reload Needed</span>
              </div>
              <h2 className="font-serif text-2xl font-bold text-[#1e3a1e]">
                Mother Dairy Live Outlet
              </h2>
              <p className="text-xs text-[#3f5a3f] mt-1.5 leading-relaxed">
                A session state refresh is needed. Click below to reload the live workspace or return to login.
              </p>
            </div>

            {this.state.error?.message && (
              <div className="p-3 bg-[#f4f8f2] rounded-xl text-left text-[11px] font-mono text-slate-600 border border-[#a0c396]/30 truncate">
                {this.state.error.message}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={this.handleReset}
                className="flex-1 py-3 px-4 bg-[#1e3a1e] hover:bg-[#2d4a2d] text-white rounded-full text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
              >
                <RefreshCw className="w-4 h-4 text-[#9bc09b]" />
                <span>Reload Dashboard</span>
              </button>

              <button
                onClick={() => {
                  localStorage.removeItem('dairy_token');
                  localStorage.removeItem('dairy_user');
                  window.location.href = '/login';
                }}
                className="py-3 px-4 bg-[#ebf5eb] hover:bg-[#d8e8d8] text-[#1e3a1e] rounded-full text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Home className="w-4 h-4" />
                <span>Go to Login</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
