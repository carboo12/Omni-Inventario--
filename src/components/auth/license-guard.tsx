import React, { useEffect, useState } from 'react';
import { checkLicenseStatus, activateLicenseByKey } from '@/lib/actions/license';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Lock, RefreshCw, Key, ShieldCheck, Star } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function LicenseGuard({ children }: { children: React.ReactNode }) {
    const { toast } = useToast();
    const [status, setStatus] = useState<{
        status: string;
        isExpired: boolean;
        expirationDate: Date | null;
    } | null>(null);
    const [loading, setLoading] = useState(true);
    const [activating, setActivating] = useState(false);
    const [licenseKey, setLicenseKey] = useState('');

    const checkStatus = async () => {
        try {
            const res = await checkLicenseStatus();
            setStatus(res as any);
        } catch (error) {
            console.error('Error checking license status:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        checkStatus();
    }, []);

    const handleActivate = async () => {
        if (!licenseKey.trim()) {
            toast({ title: "Error", description: "Ingrese un código de licencia", variant: "destructive" });
            return;
        }

        setActivating(true);
        try {
            const res = await activateLicenseByKey(licenseKey);
            if (res.success) {
                toast({ title: "✅ Activado", description: res.message });
                checkStatus();
            } else {
                toast({ title: "Error", description: res.error || "Código inválido", variant: "destructive" });
            }
        } catch (error) {
            toast({ title: "Error", description: "Error al conectar con el servidor", variant: "destructive" });
        } finally {
            setActivating(false);
        }
    };

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-slate-950">
                <div className="flex flex-col items-center gap-4">
                    <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent shadow-[0_0_15px_rgba(var(--primary),0.5)]" />
                    <p className="text-slate-400 font-medium animate-pulse">Verificando Licencia...</p>
                </div>
            </div>
        );
    }

    if (status?.isExpired) {
        return (
            <div className="flex h-screen items-center justify-center bg-slate-950 p-4 overflow-hidden relative">
                {/* Background effects */}
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[120px]" />

                <Card className="w-full max-w-md border-slate-800 bg-slate-900/80 backdrop-blur-xl text-white shadow-[0_0_50px_-12px_rgba(0,0,0,0.5)] z-10">
                    <CardHeader className="text-center pb-2">
                        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-red-500/20 to-red-600/5 text-red-500 border border-red-500/20 shadow-[0_0_20px_-5px_rgba(239,68,68,0.5)]">
                            <Lock className="h-10 w-10" />
                        </div>
                        <CardTitle className="text-3xl font-black tracking-tight text-white mb-1">
                            ACCESO RESTRINGIDO
                        </CardTitle>
                        <CardDescription className="text-slate-400 text-sm">
                            Su licencia de JoyeriaPlus ha expirado o no es válida.
                        </CardDescription>
                    </CardHeader>
                    
                    <CardContent className="space-y-6 pt-4">
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="license-key" className="text-xs font-black uppercase tracking-widest text-slate-500 ml-1">
                                    CÓDIGO DE ACTIVACIÓN
                                </Label>
                                <div className="relative group">
                                    <Key className="absolute left-3 top-3 h-5 w-5 text-slate-500 group-focus-within:text-primary transition-colors" />
                                    <Input
                                        id="license-key"
                                        placeholder="XXXX-XXXX-XXXX"
                                        className="pl-10 h-12 bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-600 focus:ring-primary/20 focus:border-primary transition-all uppercase font-mono"
                                        value={licenseKey}
                                        onChange={(e) => setLicenseKey(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleActivate()}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="p-4 rounded-xl bg-slate-800/30 border border-slate-700/50 flex items-start gap-3">
                            <ShieldCheck className="h-5 w-5 text-slate-500 shrink-0 mt-0.5" />
                            <div className="text-xs text-slate-400 leading-relaxed">
                                Ingrese su código de licencia para desbloquear el sistema. Soporta licencias 
                                <span className="text-white font-bold mx-1">Anuales</span>, 
                                <span className="text-white font-bold mx-1">Permanentes</span> y 
                                <span className="text-amber-400 font-bold mx-1 flex-inline items-center gap-1"><Star className="h-3 w-3 inline mb-0.5" />Premium</span>.
                            </div>
                        </div>
                    </CardContent>

                    <CardFooter className="flex flex-col gap-6 pb-8">
                        <Button 
                            onClick={handleActivate} 
                            disabled={activating || !licenseKey.trim()}
                            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-black h-14 text-lg shadow-[0_10px_20px_-10px_rgba(var(--primary),0.5)] transition-all hover:translate-y-[-2px] active:translate-y-[0px]"
                        >
                            {activating ? (
                                <RefreshCw className="mr-2 h-6 w-6 animate-spin" />
                            ) : (
                                <ShieldCheck className="mr-2 h-6 w-6" />
                            )}
                            ACTIVAR AHORA
                        </Button>
                        
                        <div className="flex items-center justify-center gap-2 text-[10px] text-slate-600 font-bold uppercase tracking-[0.2em]">
                            <div className="h-px w-8 bg-slate-800" />
                            JoyeriaPlus System Pro
                            <div className="h-px w-8 bg-slate-800" />
                        </div>
                    </CardFooter>
                </Card>
            </div>
        );
    }

    return <>{children}</>;
}

