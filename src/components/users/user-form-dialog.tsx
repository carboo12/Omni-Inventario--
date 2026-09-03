
"use client";

import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { ManagedUser, UserRole, InventoryType } from "@/lib/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useBusinessMode } from "@/hooks/use-business-mode";
import { useSettings } from "@/hooks/use-settings";

const formSchema = z.object({
  name: z.string().min(2, { message: "El nombre debe tener al menos 2 caracteres." }),
  role: z.enum(["cashier", "dispatcher", "admin", "master-admin", "rutero"]),
  password: z.string().min(6, { message: "La contraseña debe tener al menos 6 caracteres." }),
  inventoryType: z.enum(["pharmacy", "general", "jewelry"]).optional(),
  assignedLocation: z.enum(["A", "B", "ALL"]).optional(),
}).refine(data => {
  if ((data.role === 'cashier' || data.role === 'dispatcher' || data.role === 'rutero') && !data.inventoryType) {
    return false;
  }
  return true;
}, {
  message: "El tipo de inventario es requerido para cajeros, despachadores y ruteros.",
  path: ["inventoryType"],
});


type UserFormValues = z.infer<typeof formSchema>;

interface UserFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (user: ManagedUser) => void;
  user: ManagedUser | null;
}

export function UserFormDialog({ isOpen, onClose, onSave, user }: UserFormDialogProps) {
  const { mode } = useBusinessMode();
  const { settings } = useSettings();
  const isBoutique = (mode as string) === 'BOUTIQUE';
  const isDistribuidora = (mode as string) === 'DISTRIBUIDORA';
  const defaultsToGeneral = isBoutique || isDistribuidora;
  const { toast } = useToast();

  const form = useForm<UserFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      role: "cashier",
      password: "",
      inventoryType: defaultsToGeneral ? "general" : "pharmacy",
      assignedLocation: "ALL"
    },
  });

  const role = form.watch("role");
  const inventoryType = form.watch("inventoryType");

  useEffect(() => {
    if (isOpen) {
      if (user) {
        form.reset({
          name: user.name,
          role: user.role,
          password: user.password || "",
          inventoryType: user.inventoryType,
          assignedLocation: (user as any).assignedLocation || "ALL",
        });
      } else {
        form.reset({
          name: "",
          role: "cashier",
          password: "",
          inventoryType: defaultsToGeneral ? "general" : "pharmacy",
          assignedLocation: "ALL"
        });
      }
    }
  }, [user, form, isOpen]);

  const handleSubmit = (values: UserFormValues) => {
    const userData: ManagedUser = {
      id: user ? user.id : "",
      name: values.name,
      role: values.role as UserRole,
      password: values.password,
      status: user ? user.status : 'activo',
      inventoryType: (values.role === 'cashier' || values.role === 'dispatcher' || values.role === 'rutero') ? values.inventoryType : undefined,
      assignedLocation: values.role === 'master-admin' ? 'ALL' : values.assignedLocation,
    };
    onSave(userData);
    toast({
      title: user ? "Usuario Actualizado" : "Usuario Creado",
      description: `El usuario ${values.name} ha sido ${user ? 'actualizado' : 'creado'} correctamente.`,
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{user ? "Editar Usuario" : "Crear Nuevo Usuario"}</DialogTitle>
          <DialogDescription>
            {user ? "Edite los detalles del usuario a continuación." : "Complete los detalles para crear un nuevo usuario."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre Completo</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: Juan Pérez" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contraseña</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="******" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Rol</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione un rol" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="cashier">Cajero/a</SelectItem>
                      {settings.workflow === 'dispatcher-cashier' && (
                        <SelectItem value="dispatcher">Despachador/a</SelectItem>
                      )}
                      <SelectItem value="admin">Administrador/a</SelectItem>
                      <SelectItem value="rutero">Rutero</SelectItem>
                      <SelectItem value="master-admin">Principal</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            {(role === 'cashier' || role === 'dispatcher' || role === 'rutero') && (
              <FormField
                control={form.control}
                name="inventoryType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Inventario Asignado</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value || "pharmacy"}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccione un tipo de inventario" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {!isBoutique && <SelectItem value="pharmacy">Farmacia (Medicamentos)</SelectItem>}
                        <SelectItem value="general">{isBoutique ? "Inventario Boutique (Ropa/Zapatos)" : "General (Productos Varios)"}</SelectItem>
                        <SelectItem value="jewelry">Joyería</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            
            {/* Show only for Jewelry pieces or standard Admin. Master-admin sees everything. */}
            {((inventoryType === 'jewelry' && (role === 'cashier' || role === 'dispatcher')) || role === 'admin' || role === 'rutero') && (
              <FormField
                control={form.control}
                name="assignedLocation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ubicación de Inventario Asignada</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value || "ALL"}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccione una ubicación" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="ALL">Todas las Ubicaciones (A y B)</SelectItem>
                        <SelectItem value="A">Almacén A (Casa)</SelectItem>
                        <SelectItem value="B">Tienda B</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit">Guardar</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
