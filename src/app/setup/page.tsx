'use client';

import { useState } from 'react';
import { useRouter } from '@/lib/router-nav';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { registerFirstUser } from '@/lib/actions/auth';
import { ShieldCheck } from 'lucide-react';

export default function SetupPage() {
    const [name, setName] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const { toast } = useToast();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            toast({
                title: "Error",
                description: "Las contraseñas no coinciden.",
                variant: "destructive"
            });
            return;
        }

        if (password.length < 6) {
            toast({
                title: "Error",
                description: "La contraseña debe tener al menos 6 caracteres.",
                variant: "destructive"
            });
            return;
        }

        setLoading(true);

        try {
            const result = await registerFirstUser({ name, password });

            if (result.success) {
                toast({
                    title: "¡Éxito!",
                    description: "Administrador creado correctamente. Por favor inicia sesión.",
                });
                router.push('/');
            } else {
                toast({
                    title: "Error",
                    description: result.error || "Hubo un problema al crear el usuario.",
                    variant: "destructive"
                });
            }
        } catch (error) {
            toast({
                title: "Error",
                description: "Ocurrió un error inesperado.",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-muted/50 p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                        <ShieldCheck className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle className="text-2xl">Configuración Inicial</CardTitle>
                    <CardDescription>
                        Bienvenido a Omni Inventario +. No se detectaron usuarios en el sistema. Por favor, crea la cuenta de Administrador Principal.
                    </CardDescription>
                </CardHeader>
                <form onSubmit={handleSubmit}>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Nombre Completo</Label>
                            <Input
                                id="name"
                                placeholder="Ej. Juan Pérez"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">Contraseña</Label>
                            <Input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="confirmPassword">Confirmar Contraseña</Label>
                            <Input
                                id="confirmPassword"
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                            />
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button className="w-full" type="submit" disabled={loading}>
                            {loading ? 'Creando...' : 'Crear Administrador'}
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
}
