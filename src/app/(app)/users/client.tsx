"use client";

import React, { useState, useMemo } from "react";
import type { ManagedUser } from "@/lib/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UserFormDialog } from "@/components/users/user-form-dialog";
import { PlusCircle, Edit, UserX, UserCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { createUser, updateUser } from "@/lib/actions/users";
import { useToast } from "@/hooks/use-toast";

interface UsersClientProps {
  initialUsers: any[];
}

export default function UsersClient({ initialUsers }: UsersClientProps) {
  const [users, setUsers] = useState<ManagedUser[]>(initialUsers as ManagedUser[]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<ManagedUser | null>(null);
  const { toast } = useToast();

  const sortedUsers = useMemo(() => {
    return [...users].sort((a, b) => a.name.localeCompare(b.name));
  }, [users]);

  const handleSaveUser = async (user: ManagedUser) => {
    if (editingUser) {
      const result = await updateUser(user.id, {
        name: user.name,
        role: user.role,
        password: user.password,
        inventoryType: user.inventoryType
      });
      if (result.success) {
        setUsers(users.map((u) => (u.id === user.id ? { ...u, ...user } : u)));
        toast({ title: "Usuario actualizado" });
      } else {
        toast({ title: "Error al actualizar", description: result.error, variant: "destructive" });
      }
    } else {
      const result = await createUser({
        name: user.name,
        role: user.role,
        password: user.password || null,
        status: 'activo',
        inventoryType: user.inventoryType || null
      });
      if (result.success) {
        setUsers([...users, result.data as unknown as ManagedUser]);
        toast({ title: "Usuario creado" });
      } else {
        toast({ title: "Error al crear", description: result.error, variant: "destructive" });
      }
    }
    setEditingUser(null);
    setIsDialogOpen(false);
  };

  const handleEditUser = (user: ManagedUser) => {
    setEditingUser(user);
    setIsDialogOpen(true);
  };

  const handleAddNewUser = () => {
    setEditingUser(null);
    setIsDialogOpen(true);
  }

  const handleToggleUserStatus = async (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (!user) return;
    const newStatus = user.status === 'activo' ? 'inactivo' : 'activo';

    const result = await updateUser(userId, { status: newStatus });
    if (result.success) {
      setUsers(users.map(u =>
        u.id === userId
          ? { ...u, status: newStatus }
          : u
      ));
      toast({ title: `Usuario ${newStatus === 'activo' ? 'activado' : 'desactivado'}` });
    } else {
      toast({ title: "Error al cambiar estado", description: result.error, variant: "destructive" });
    }
  };

  const getRoleDisplayName = (role: ManagedUser['role']) => {
    const names = {
      'master-admin': 'Admin Principal',
      'admin': 'Administrador',
      'dispatcher': 'Despachador',
      'cashier': 'Cajero',
      'rutero': 'Rutero'
    };
    return names[role];
  }

  return (
    <>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-headline font-bold tracking-tight md:text-3xl">
            Gestión de Usuarios
          </h1>
          <p className="text-muted-foreground">
            Crear, editar y gestionar cuentas de usuario.
          </p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Lista de Usuarios</CardTitle>
                <CardDescription>
                  Usuarios actuales con acceso al sistema.
                </CardDescription>
              </div>
              <Button onClick={handleAddNewUser}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Añadir Usuario
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Rol</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedUsers.length > 0 ? (
                    sortedUsers.map((user) => (
                      <TableRow key={user.id} className={cn(user.status === 'inactivo' && 'text-muted-foreground bg-muted/30')}>
                        <TableCell className="font-medium">
                          {user.name}
                        </TableCell>
                        <TableCell>
                          <Badge variant={user.status === 'inactivo' ? 'outline' : 'secondary'}>{getRoleDisplayName(user.role)}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={user.status === 'inactivo' ? 'outline' : 'default'} className={cn(user.status === 'activo' && 'bg-green-100 text-green-800 border-green-200')}>
                            {user.status === 'activo' ? 'Activo' : 'Inactivo'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditUser(user)}
                            disabled={user.status === 'inactivo'}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleToggleUserStatus(user.id)}
                            className={cn(user.status === 'activo' ? 'text-destructive hover:text-destructive' : 'text-primary hover:text-primary')}
                          >
                            {user.status === 'activo' ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="h-24 text-center">
                        No se encontraron usuarios.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      <UserFormDialog
        isOpen={isDialogOpen}
        onClose={() => {
          setIsDialogOpen(false);
          setEditingUser(null);
        }}
        onSave={handleSaveUser}
        user={editingUser}
      />
    </>
  );
}