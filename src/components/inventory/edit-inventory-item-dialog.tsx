
"use client";

import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { InventoryItem } from '@/lib/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { useBusinessMode } from '@/hooks/use-business-mode';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { Calendar } from '../ui/calendar';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

// Simplified schema for adjustment only
const formSchema = z.object({
  quantity: z.coerce.number().int().min(0, { message: "La cantidad no puede ser negativa." }),
});

type FormValues = z.infer<typeof formSchema>;

interface EditInventoryItemDialogProps {
  item: InventoryItem;
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: InventoryItem) => Promise<void>;
  mode: 'adjust';
}

export function EditInventoryItemDialog({ item, isOpen, onClose, onSave, mode: dialogMode }: EditInventoryItemDialogProps) {
  const { mode } = useBusinessMode();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      quantity: item.quantity,
    },
  });

  useEffect(() => {
    form.reset({
      quantity: item.quantity,
    });
    setIsSaving(false);
  }, [item, form, isOpen]);


  const handleSubmit = async (values: FormValues) => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      await onSave({
        ...item,
        quantity: values.quantity,
      });
      toast({
        title: `Artículo Ajustado`,
        description: `El stock de ${item.productName} ha sido actualizado.`,
      });
    } catch (error) {
      console.error("Error saving item", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={isSaving ? undefined : onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Ajustar Cantidad</DialogTitle>
          <DialogDescription>
            Ajuste la cantidad para {item.productName}
            {mode === 'PHARMACY' && ` (Lote: ${item.batch})`}.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="quantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nueva Cantidad</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} disabled={isSaving} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>Cancelar</Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Guardando...</> : 'Guardar Cambios'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
