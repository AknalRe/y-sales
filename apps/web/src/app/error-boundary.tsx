import { Component, type ErrorInfo, type ReactNode } from 'react';

type AppErrorBoundaryProps = {
  children: ReactNode;
};

type AppErrorBoundaryState = {
  hasError: boolean;
};

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): AppErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Aplikasi gagal dirender', error, errorInfo);
  }

  private reload = () => {
    window.location.reload();
  };

  private resetAppCache = async () => {
    const registrations = await navigator.serviceWorker?.getRegistrations?.();
    await Promise.all((registrations ?? []).map((registration) => registration.unregister()));

    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
    }

    window.location.reload();
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <main
        style={{
          minHeight: '100dvh',
          display: 'grid',
          placeItems: 'center',
          padding: 24,
          background: '#f8fafc',
          color: '#0f172a',
          fontFamily: 'Inter, system-ui, sans-serif',
        }}
      >
        <section
          style={{
            width: 'min(100%, 420px)',
            border: '1px solid #e2e8f0',
            borderRadius: 24,
            background: '#ffffff',
            boxShadow: '0 24px 80px rgba(15, 23, 42, 0.12)',
            padding: 24,
          }}
        >
          <p style={{ margin: 0, color: '#ea580c', fontSize: 12, fontWeight: 800, letterSpacing: 1 }}>
            APLIKASI PERLU DIMUAT ULANG
          </p>
          <h1 style={{ margin: '8px 0 8px', fontSize: 24, lineHeight: 1.2 }}>Tampilan gagal dimuat</h1>
          <p style={{ margin: 0, color: '#64748b', fontSize: 14, lineHeight: 1.6 }}>
            Biasanya terjadi setelah update aplikasi atau cache PWA masih menyimpan versi lama.
          </p>
          <div style={{ display: 'flex', gap: 10, marginTop: 22, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={this.reload}
              style={{
                border: '1px solid #cbd5e1',
                borderRadius: 14,
                background: '#ffffff',
                color: '#334155',
                fontWeight: 800,
                padding: '12px 16px',
              }}
            >
              Muat ulang
            </button>
            <button
              type="button"
              onClick={this.resetAppCache}
              style={{
                border: 0,
                borderRadius: 14,
                background: '#f97316',
                color: '#ffffff',
                fontWeight: 800,
                padding: '12px 16px',
              }}
            >
              Reset cache
            </button>
          </div>
        </section>
      </main>
    );
  }
}
