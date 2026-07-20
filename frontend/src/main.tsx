import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import './index.css';
import { initLocalSyncQueue, syncLocalQueue } from './lib/localSyncQueue';
import { useSyncStore } from './stores/useSyncStore';
import { restoreSecureSession } from './lib/secureSession';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

window.addEventListener('online', () => useSyncStore.getState().setOnlineStatus(true));
window.addEventListener('offline', () => useSyncStore.getState().setOnlineStatus(false));

if (window.__TAURI__) {
  void restoreSecureSession();
  void initLocalSyncQueue();
  void import('@tauri-apps/api/event').then(({ listen }) => {
    void listen<boolean>('network-status', (event) => {
      useSyncStore.getState().setOnlineStatus(Boolean(event.payload));
      if (event.payload) void syncLocalQueue();
    });
  });
  window.setInterval(() => {
    if (useSyncStore.getState().isOnline) void syncLocalQueue();
  }, 60_000);
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>
);
