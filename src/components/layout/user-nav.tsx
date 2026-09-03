
"use client";

import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, User as UserIcon, DoorClosed } from "lucide-react";
import { useCashRegister } from "@/hooks/use-cash-register";
import { useRouter } from '@/lib/router-nav';

export function UserNav() {
  const { user, logout } = useAuth();
  const { isCashRegisterOpen } = useCashRegister();
  const router = useRouter();


  if (!user) {
    return null;
  }

  const handleCloseRegister = () => {
    router.push('/cash-register/close');
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <div className="h-8 w-8 flex items-center justify-center bg-muted rounded-full">
            <UserIcon className="h-5 w-5 text-muted-foreground" />
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user.name}</p>
            <p className="text-xs leading-none text-muted-foreground capitalize">
              {user.role.replace('-', ' ')}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          {user.role === 'cashier' && isCashRegisterOpen && (
            <DropdownMenuItem onClick={handleCloseRegister}>
              <DoorClosed className="mr-2 h-4 w-4" />
              <span>Cerrar Caja</span>
            </DropdownMenuItem>
          )}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={logout}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>Cerrar Sesión</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
