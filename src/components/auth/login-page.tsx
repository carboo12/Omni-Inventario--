'use client';

import { useEffect, useState } from 'react';
import { useRouter } from '@/lib/router-nav';
import { LoginForm } from '@/components/auth/login-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { checkUsersExist } from '@/lib/actions/auth';
import { Loader2 } from 'lucide-react';

export function LoginPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const users = await checkUsersExist();
        if (mounted && !users.error && !users.exists) {
          router.replace('/setup');
          return;
        }
      } catch {
        // Si falla la consulta, igualmente mostramos el login.
      }
      if (mounted) setReady(true);
    })();
    return () => {
      mounted = false;
    };
  }, [router]);

  if (!ready) {
    return (
      <main className="flex min-h-screen items-center justify-center p-4 relative bg-[#0f172a]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4 relative">
      <div className="absolute inset-0 -z-10 bg-[#0f172a]" />
      <Card className="w-full max-w-sm shadow-2xl">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-headline text-primary">Omni Inventario +</CardTitle>
          <CardDescription>Sistema Integrado de Gestión Inventario</CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm />
        </CardContent>
      </Card>
    </main>
  );
}