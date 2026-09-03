'use client';

import { WifiOff, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function OfflinePage() {
  return (
    <div className="flex min-h-[80vh] items-center justify-center p-4">
      <Card className="w-full max-w-sm text-center">
        <CardContent className="space-y-6 p-8">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <WifiOff className="h-8 w-8 text-muted-foreground" />
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-headline font-bold">Sin conexión</h1>
            <p className="text-sm text-muted-foreground">
              No se puede conectar al servidor. Verifique su conexión a internet e intente nuevamente.
            </p>
          </div>
          <Button onClick={() => window.location.reload()} className="w-full h-12">
            <RefreshCw className="mr-2 h-4 w-4" />
            Reintentar
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
