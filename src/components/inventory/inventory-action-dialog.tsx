
"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Pencil, SlidersHorizontal } from 'lucide-react';

interface InventoryActionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onEdit: () => void;
  onAdjust: () => void;
  productName: string;
}

export function InventoryActionDialog({ isOpen, onClose, onEdit, onAdjust, productName }: InventoryActionDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Acciones para {productName}</DialogTitle>
          <DialogDescription>
            Seleccione una acción para realizar en este artículo del inventario.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col space-y-2 py-4">
          <Button variant="outline" onClick={onEdit}>
            <Pencil className="mr-2 h-4 w-4" />
            Editar Artículo
          </Button>
          <Button variant="outline" onClick={onAdjust}>
            <SlidersHorizontal className="mr-2 h-4 w-4" />
            Ajustar Cantidad
          </Button>
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
