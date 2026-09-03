"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LockKeyhole } from "lucide-react";
import Link from '@/lib/router-nav';
import { useSearchParams } from '@/lib/router-nav';
import { Suspense } from "react";

function LockedPageContent() {
    const searchParams = useSearchParams();
    const username = searchParams.get("username");

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
            <Card className="w-full max-w-md text-center">
                <CardHeader>
                    <div className="flex justify-center mb-4">
                        <div className="p-3 bg-red-100 rounded-full dark:bg-red-900/20">
                            <LockKeyhole className="h-8 w-8 text-red-600 dark:text-red-400" />
                        </div>
                    </div>
                    <CardTitle className="text-2xl font-bold text-red-600 dark:text-red-400">
                        Cuenta Bloqueada
                    </CardTitle>
                    <CardDescription className="text-base mt-2">
                        Has excedido el número máximo de intentos de inicio de sesión (6).
                        Por seguridad, tu cuenta ha sido bloqueada temporalmente.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                        Para recuperar el acceso, necesitas contactar al administrador del sistema o restablecer tu contraseña.
                    </p>
                    <div className="flex flex-col gap-2">
                        <Button asChild variant="default" className="w-full">
                            <Link href={`/reset-password${username ? `?username=${encodeURIComponent(username)}` : ''}`}>
                                Renovar / Cambiar Contraseña
                            </Link>
                        </Button>
                        <Button asChild variant="outline" className="w-full">
                            <Link href="/">
                                Volver al Inicio de Sesión
                            </Link>
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

export default function LockedPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Cargando...</div>}>
            <LockedPageContent />
        </Suspense>
    );
}
