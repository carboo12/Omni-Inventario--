'use client';

import { useState, useEffect } from 'react';
import { checkActivationStatus, activateSystem } from '@/actions/activation';
import { checkUsersExist } from '@/lib/actions/auth';
import { Loader2, Lock, ShieldCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { usePathname, useRouter } from '@/lib/router-nav';

export function ActivationGuard({ children }: { children: React.ReactNode }) {
    const [mounted, setMounted] = useState(false);
    const [isActivated, setIsActivated] = useState<boolean | null>(null);
    const [licenseKey, setLicenseKey] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        setMounted(true);
        checkStatus();
    }, []);

    const checkStatus = async () => {
        try {
            const status = await checkActivationStatus() || { isActivated: false, isPremium: false, error: 'Respuesta inválida' };
            if (status.error) {
                toast({
                    title: "Estado del Sistema",
                    description: status.error,
                    variant: "destructive",
                });
            }
            const activated = !!status.isActivated;
            setIsActivated(activated);
            if (activated) {
                await redirectToSetupWhenNeeded();
            }
        } catch (error) {
            console.error('Error in ActivationGuard checkStatus:', error);
            setIsActivated(false);
        }
    };

    const redirectToSetupWhenNeeded = async () => {
        const users = await checkUsersExist();
        if (users.error) {
            toast({
                title: "Estado del Sistema",
                description: users.error,
                variant: "destructive",
            });
            return;
        }

        if (!users.exists) {
            if (typeof window !== 'undefined' && window.location.pathname !== '/setup') {
                router.replace('/setup');
                window.location.replace('/setup');
            }
        }
    };

    const handleActivate = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const result = await activateSystem(licenseKey);

            if (result.success) {
                toast({
                    title: "¡Sistema Activado!",
                    description: result.message,
                });
                setIsActivated(true);
                await redirectToSetupWhenNeeded();
            } else {
                toast({
                    title: "Error de Activación",
                    description: result.message,
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

    if (!mounted) return null;

    if (isActivated === null) {
        return (
            <div className="h-screen w-screen flex items-center justify-center bg-slate-950">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
        );
    }

    if (isActivated) {
        return <>{children}</>;
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950 p-4">
            {/* Background effects */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px]" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[120px]" />

            <div className="w-full max-w-md p-1 bg-gradient-to-br from-slate-800 to-slate-900 rounded-[2rem] shadow-2xl z-10">
                <div className="bg-slate-900/90 backdrop-blur-xl p-8 rounded-[1.8rem] border border-white/5">
                    <div className="flex flex-col items-center text-center mb-8">
                        <div className="h-20 w-20 bg-primary/10 rounded-3xl flex items-center justify-center mb-6 border border-primary/20 shadow-[0_0_30px_-5px_rgba(var(--primary),0.3)]">
                            <Lock className="h-10 w-10 text-primary" />
                        </div>
                        <h1 className="text-3xl font-black text-white tracking-tight uppercase">Activación Requerida</h1>
                        <p className="text-slate-400 mt-2 text-sm">
                            El sistema JoyeriaPlus requiere una licencia válida para iniciar operaciones.
                        </p>
                    </div>

                    <form onSubmit={handleActivate} className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="license" className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">
                                CÓDIGO DE ACTIVACIÓN
                            </Label>
                            <div className="relative group">
                                <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-600 group-focus-within:text-primary transition-colors" />
                                <input
                                    id="license"
                                    type="text"
                                    value={licenseKey}
                                    onChange={(e) => setLicenseKey(e.target.value.toUpperCase())}
                                    placeholder="XXXX-XXXX"
                                    className="w-full pl-12 pr-4 py-4 rounded-2xl bg-slate-800/50 border border-slate-700 text-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-center text-xl tracking-[0.3em] uppercase font-mono shadow-inner"
                                    required
                                    autoFocus
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading || !licenseKey.trim()}
                            className="w-full py-4 px-6 bg-primary hover:bg-primary/90 text-primary-foreground font-black rounded-2xl shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50"
                        >
                            {isLoading ? (
                                <Loader2 className="h-6 w-6 animate-spin" />
                            ) : (
                                <>
                                    <ShieldCheck className="h-6 w-6" />
                                    ACTIVAR SISTEMA
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-8 pt-8 border-t border-white/5 text-center flex flex-col gap-2">
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                            JoyeriaPlus Professional Edition
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

