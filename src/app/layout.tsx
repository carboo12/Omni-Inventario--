import './globals.css';
import { Toaster } from '@/components/ui/toaster';

// Este archivo ya no es el layout raíz de Next.js. El layout real vive en
// src/router.tsx (TanStack Router). Se conserva solo para mantener la ruta
// src/app/globals.css referenciada por main.tsx.

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className="font-body antialiased">
        {children}
        <Toaster />
      </body>
    </html>
  );
}