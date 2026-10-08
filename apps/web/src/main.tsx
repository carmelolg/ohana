import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { del, get, set } from 'idb-keyval';
import { registerSW } from 'virtual:pwa-register';
import { App } from './App';
import './styles.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 15_000, gcTime: 1000 * 60 * 60 * 24 * 14, networkMode: 'offlineFirst', retry: 1 },
  },
});

const persister = {
  persistClient: (c: unknown) => set('ohana-query-cache', c),
  restoreClient: () => get('ohana-query-cache'),
  removeClient: () => del('ohana-query-cache'),
} as never;

registerSW({ immediate: true });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister, maxAge: 1000 * 60 * 60 * 24 * 14 }}
    >
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </PersistQueryClientProvider>
  </StrictMode>,
);
