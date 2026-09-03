
"use client";

import * as React from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LogIn, Loader2, Eye, EyeOff } from "lucide-react";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { useToast } from "@/hooks/use-toast";

export function LoginForm({ onSuccess }: { onSuccess?: () => void }) {
  const [name, setName] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const { login } = useAuth();
  const [isLoggingIn, setIsLoggingIn] = React.useState(false);
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !password) return;

    setIsLoggingIn(true);

    try {
      const result = await login(name, password);
      if (!result.success) {
        if (result.error?.includes("Usuario bloqueado")) {
          window.location.href = `/locked?username=${encodeURIComponent(name)}`;
          return;
        }

        toast({
          title: "Error de inicio de sesión",
          description: result.error || "Credenciales inválidas",
          variant: "destructive"
        });
      } else {
        if (onSuccess) {
          onSuccess();
        }
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Ocurrió un error inesperado",
        variant: "destructive"
      });
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <form onSubmit={handleLogin} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="name">Usuario</Label>
        <Input
          id="name"
          placeholder="Ingrese su nombre de usuario"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Contraseña</Label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            placeholder="******"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-gray-500 hover:text-gray-700"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? (
              <EyeOff className="h-5 w-5" />
            ) : (
              <Eye className="h-5 w-5" />
            )}
            <span className="sr-only">
              {showPassword ? "Ocultar contraseña" : "Ver contraseña"}
            </span>
          </Button>
        </div>
      </div>
      <Button type="submit" className="w-full" disabled={isLoggingIn || !name || !password}>
        {isLoggingIn ? (
          <Loader2 className="animate-spin mr-2" />
        ) : (
          <LogIn className="mr-2" />
        )}
        {isLoggingIn ? 'Iniciando Sesión...' : 'Iniciar Sesión'}
      </Button>
    </form>
  );
}
