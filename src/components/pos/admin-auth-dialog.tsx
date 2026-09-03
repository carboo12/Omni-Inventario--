"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { authorizeAction } from "@/lib/actions/admin-auth";
import { Loader2, Eye, EyeOff } from "lucide-react";

interface AdminAuthDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export function AdminAuthDialog({ isOpen, onClose, onSuccess }: AdminAuthDialogProps) {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");

    const handleAuthorize = async () => {
        if (!username || !password) {
            setError("Ingrese usuario y contraseña");
            return;
        }

        setIsLoading(true);
        setError("");

        const result = await authorizeAction(username, password);
        setIsLoading(false);

        if (result.success) {
            onSuccess();
            handleClose();
        } else {
            setError(result.error || "Autorización fallida");
        }
    };

    const handleClose = () => {
        setUsername("");
        setPassword("");
        setShowPassword(false);
        setError("");
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Autorización Requerida</DialogTitle>
                    <DialogDescription>
                        Ingrese credenciales de administrador para continuar.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Usuario (Admin)</label>
                        <Input
                            placeholder="Usuario"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Contraseña / PIN</label>
                        <div className="relative">
                            <Input
                                type={showPassword ? "text" : "password"}
                                placeholder="********"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleAuthorize()}
                                className="pr-10"
                            />
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                onClick={() => setShowPassword(!showPassword)}
                            >
                                {showPassword ? (
                                    <EyeOff className="h-4 w-4 text-gray-500" />
                                ) : (
                                    <Eye className="h-4 w-4 text-gray-500" />
                                )}
                            </Button>
                        </div>
                    </div>

                    {error && <p className="text-red-500 text-sm font-bold">{error}</p>}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={handleClose}>Cancelar</Button>
                    <Button onClick={handleAuthorize} disabled={isLoading}>
                        {isLoading ? <Loader2 className="animate-spin mr-2" /> : null}
                        Autorizar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
