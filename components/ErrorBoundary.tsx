import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Bắt lỗi render/lifecycle — tránh màn hình chỉ còn nền body (#0f172a) khi có exception.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (this.state.hasError && this.state.error) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-950 text-slate-100">
          <p className="text-lg font-bold mb-2">Đã xảy ra lỗi giao diện</p>
          <p className="text-sm text-slate-400 text-center max-w-md mb-4">
            Ứng dụng gặp lỗi không mong muốn (thường do dữ liệu tạm thời hoặc mạng). Bạn có thể tải lại trang hoặc xóa dữ liệu trang này trong DevTools nếu lỗi lặp lại.
          </p>
          <pre className="text-xs text-amber-400/90 bg-slate-900/80 p-3 rounded-lg max-w-full overflow-auto mb-6 max-h-32">
            {this.state.error.message}
          </pre>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 font-semibold text-white"
          >
            Tải lại trang
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
