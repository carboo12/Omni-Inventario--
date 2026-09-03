import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from '@tanstack/react-router';
import { router } from './router';
import '@/app/globals.css';

// Silencia de forma silenciosa los errores de comunicación de extensiones del
// navegador (p. ej. "Unchecked runtime.lastError: Could not establish
// connection. Receiving end does not exist."). No afecta errores reales de la app.
const isExtensionRuntimeError = (message?: string) =>
  typeof message === 'string' &&
  (message.includes('Could not establish connection') ||
    message.includes('runtime.lastError') ||
    message.includes('Receiving end does not exist'));

if (typeof window !== 'undefined') {
  window.addEventListener('error', (e) => {
    if (isExtensionRuntimeError(e.message)) {
      e.preventDefault();
      e.stopImmediatePropagation();
    }
  });
  window.addEventListener('unhandledrejection', (e) => {
    const reason = e.reason;
    const message =
      typeof reason === 'string'
        ? reason
        : (reason as { message?: string } | undefined)?.message;
    if (isExtensionRuntimeError(message)) {
      e.preventDefault();
    }
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);