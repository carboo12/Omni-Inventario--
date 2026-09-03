'use client';

import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { LoginForm } from './login-form';

interface QuickSwitchModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function QuickSwitchModal({ open, onOpenChange }: QuickSwitchModalProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Cambio Rápido de Usuario</DialogTitle>
                    <DialogDescription>
                        Ingrese las credenciales del usuario al que desea cambiar.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    <LoginForm onSuccess={() => onOpenChange(false)} />
                </div>
            </DialogContent>
        </Dialog>
    );
}

export default QuickSwitchModal;
