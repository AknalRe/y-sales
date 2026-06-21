import { AppProviders } from '@/app/providers';
import { AppRouter } from '@/app/router';
import { AppErrorBoundary } from '@/app/error-boundary';

export default function App() {
  return (
    <AppProviders>
      <AppErrorBoundary>
        <AppRouter />
      </AppErrorBoundary>
    </AppProviders>
  );
}

