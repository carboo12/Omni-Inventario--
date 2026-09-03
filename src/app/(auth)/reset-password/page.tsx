"use client";

import { Suspense, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { resetPassword } from "@/lib/actions/auth";
import { Loader2, KeyRound, ArrowLeft, Eye, EyeOff } from "lucide-react";
import Link from '@/lib/router-nav';
import { useRouter, useSearchParams } from '@/lib/router-nav';

function ResetPasswordContent() {
    const searchParams = useSearchParams();
    const [username, setUsername] = useState(searchParams.get("username") || "");
    const [recoveryKey, setRecoveryKey] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [showRecoveryKey, setShowRecoveryKey] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();
    const router = useRouter();

    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!username || !recoveryKey || !newPassword) {
            toast({
                title: "Error",
                description: "Por favor complete todos los campos.",
                variant: "destructive",
            });
            return;
        }

        setIsLoading(true);

        try {
            const result = await resetPassword(username, recoveryKey, newPassword);
            if (result.success) {
                toast({
                    title: "Éxito",
                    description: "Contraseña restablecida correctamente. Ahora puede iniciar sesión.",
                });
                router.push("/");
            } else {
                toast({
                    title: "Error",
                    description: result.error || "No se pudo restablecer la contraseña.",
                    variant: "destructive",
                });
            }
        } catch (error) {
            toast({
                title: "Error",
                description: "Ocurrió un error inesperado.",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <div className="flex justify-center mb-4">
                        <div className="p-3 bg-primary/10 rounded-full">
                            <KeyRound className="h-8 w-8 text-primary" />
                        </div>
                    </div>
                    <CardTitle className="text-2xl font-bold text-center">Recuperar Contraseña</CardTitle>
                    <CardDescription className="text-center">
                        Ingrese su usuario y la llave de recuperación proporcionada por el administrador.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleReset} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="username">Usuario</Label>
                            <Input
                                id="username"
                                placeholder="Nombre de usuario"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="recoveryKey">Llave de Recuperación</Label>
                            <div className="relative">
                                <Input
                                    id="recoveryKey"
                                    type={showRecoveryKey ? "text" : "password"}
                                    placeholder="Ingrese la llave maestra"
                                    value={recoveryKey}
                                    onChange={(e) => setRecoveryKey(e.target.value)}
                                    required
                                    className="pr-10"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowRecoveryKey(!showRecoveryKey)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                                >
                                    {showRecoveryKey ? (
                                        <EyeOff className="h-4 w-4" />
                                    ) : (
                                        <Eye className="h-4 w-4" />
                                    )}
                                </button>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="newPassword">Nueva Contraseña</Label>
                            <div className="relative">
                                <Input
                                    id="newPassword"
                                    type={showNewPassword ? "text" : "password"}
                                    placeholder="Nueva contraseña"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    required
                                    className="pr-10"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowNewPassword(!showNewPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                                >
                                    {showNewPassword ? (
                                        <EyeOff className="h-4 w-4" />
                                    ) : (
                                        <Eye className="h-4 w-4" />
                                    )}
                                </button>
                            </div>
                        </div>
                        <Button type="submit" className="w-full" disabled={isLoading}>
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Procesando...
                                </>
                            ) : (
                                "Restablecer Contraseña"
                            )}
                        </Button>
                        <div className="text-center mt-4">
                            <Link href="/" className="text-sm text-muted-foreground hover:text-primary flex items-center justify-center gap-2">
                                <ArrowLeft className="h-4 w-4" /> Volver al Inicio de Sesión
                            </Link>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}

export default function ResetPasswordPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Cargando...</div>}>
            <ResetPasswordContent />
        </Suspense>
    );
}
