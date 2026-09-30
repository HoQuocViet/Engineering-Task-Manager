import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import './index.css';

// Guard against third-party browser extension errors (e.g., MetaMask, Solana, Web3 injectors)
if (typeof window !== 'undefined') {
  const isExtensionError = (str: string) => {
    const s = (str || '').toLowerCase();
    return (
      s.includes('metamask') ||
      s.includes('failed to connect to metamask') ||
      s.includes('ethereum') ||
      s.includes('web3') ||
      s.includes('wallet') ||
      s.includes('chrome-extension://') ||
      s.includes('moz-extension://') ||
      s.includes('safari-extension://') ||
      s.includes('evmprovider')
    );
  };

  const origConsoleError = console.error;
  console.error = (...args: any[]) => {
    for (const arg of args) {
      const msg = arg && (arg.message || arg.stack) ? `${arg.message} ${arg.stack}` : String(arg || '');
      if (isExtensionError(msg)) {
        return;
      }
    }
    origConsoleError.apply(console, args);
  };

  window.addEventListener(
    'unhandledrejection',
    (event) => {
      const reason = event.reason?.message || event.reason?.stack || String(event.reason || '');
      if (isExtensionError(reason)) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation?.();
      }
    },
    true
  );

  window.addEventListener(
    'error',
    (event) => {
      const msg = event.message || '';
      const filename = event.filename || '';
      const errorStr = `${msg} ${filename} ${event.error?.stack || ''}`;
      if (isExtensionError(errorStr)) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation?.();
      }
    },
    true
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);

