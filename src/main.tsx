import React, { Component, ErrorInfo, ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: "24px", color: "#ef4444", background: "#fef2f2", border: "1px solid #fee2e2", borderRadius: "8px", fontFamily: "monospace", margin: "20px", textAlign: "left" }}>
          <h1 style={{ color: "#dc2626", marginTop: 0, fontSize: "20px" }}>🚨 React Render Crash detected</h1>
          <p style={{ fontWeight: "bold" }}>{this.state.error?.toString()}</p>
          <pre style={{ whiteSpace: "pre-wrap", fontSize: "12px", background: "#f3f4f6", padding: "12px", borderRadius: "6px", maxHeight: "300px", overflow: "auto" }}>
            {this.state.errorInfo?.componentStack || this.state.error?.stack}
          </pre>
          <button 
            onClick={() => { localStorage.clear(); sessionStorage.clear(); window.location.reload(); }}
            style={{ marginTop: "16px", padding: "10px 18px", background: "#dc2626", color: "white", border: "none", borderRadius: "8px", fontWeight: "bold", cursor: "pointer" }}
          >
            Reset Cache & Reload
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

import { AuthNotificationProvider } from './components/AuthToastContainer.tsx';

// Global Event Listener for unhandledrejection to suppress benign WebSocket/Vite issues before rendering
window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason;
  const message = reason instanceof Error ? reason.message : String(reason || '');
  
  if (
    message.toLowerCase().includes('websocket') || 
    message.toLowerCase().includes('closed without opened') || 
    message.toLowerCase().includes('vite')
  ) {
    event.preventDefault();
    console.warn("[SUPPRESSED REJECTION] Suppressed benign WebSocket/Vite unhandled promise rejection:", reason);
  }
});

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <AuthNotificationProvider>
      <App />
    </AuthNotificationProvider>
  </ErrorBoundary>
);
