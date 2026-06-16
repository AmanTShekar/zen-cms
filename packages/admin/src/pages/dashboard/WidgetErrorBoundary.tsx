import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class WidgetErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Widget caught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center p-4 border border-red-500/20 bg-red-500/10 rounded min-h-[100px] h-full">
          <AlertTriangle className="text-red-500 mb-2" size={24} />
          <span className="text-xs font-bold text-red-500 uppercase tracking-wider">Widget Error</span>
          <span className="text-[10px] text-red-400 mt-1 truncate max-w-full px-2">
            {this.state.error?.message || 'Failed to render'}
          </span>
        </div>
      );
    }
    return this.props.children;
  }
}