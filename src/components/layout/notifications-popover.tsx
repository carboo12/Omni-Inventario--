"use client";

import { useState, useEffect } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Bell, Check } from "lucide-react";
import { getNotifications, markAsRead, NotificationData } from "@/lib/actions/notifications";
import { useAuth } from "@/hooks/use-auth";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";

export function NotificationsPopover() {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState<NotificationData[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);

    const fetchNotifications = async () => {
        if (!user) return;
        try {
            const data = await getNotifications(user.id);
            const validData = Array.isArray(data) ? data : [];
            setNotifications(validData);
            setUnreadCount(validData.filter(n => !n.read).length);
        } catch (error) {
            console.error("Error fetching notifications:", error);
            setNotifications([]);
        }
    };

    useEffect(() => {
        fetchNotifications();
        // Poll every 60 seconds
        const interval = setInterval(fetchNotifications, 60000);
        return () => clearInterval(interval);
    }, [user]);

    const handleMarkAsRead = async (id: string) => {
        await markAsRead(id);
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
    };

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                        <span className="absolute top-1 right-1 h-2.5 w-2.5 rounded-full bg-red-600 ring-2 ring-background" />
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="end">
                <div className="flex items-center justify-between p-4 border-b">
                    <h4 className="font-semibold">Notificaciones</h4>
                    {unreadCount > 0 && (
                        <span className="text-xs text-muted-foreground">{unreadCount} nuevas</span>
                    )}
                </div>
                <ScrollArea className="h-[300px]">
                    {notifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full p-4 text-center text-muted-foreground">
                            <Bell className="h-8 w-8 mb-2 opacity-20" />
                            <p className="text-sm">No tienes notificaciones</p>
                        </div>
                    ) : (
                        <div className="divide-y">
                            {notifications.map((notification) => (
                                <div key={notification.id} className={cn("p-4 hover:bg-muted/50 transition-colors", !notification.read && "bg-muted/20")}>
                                    <div className="flex items-start gap-3">
                                        <div className={cn("mt-1 h-2 w-2 rounded-full shrink-0",
                                            notification.type === 'info' && "bg-blue-500",
                                            notification.type === 'success' && "bg-green-500",
                                            notification.type === 'warning' && "bg-yellow-500",
                                            notification.type === 'error' && "bg-red-500",
                                        )} />
                                        <div className="flex-1 space-y-1">
                                            <p className={cn("text-sm", !notification.read && "font-medium")}>{notification.message}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true, locale: es })}
                                            </p>
                                        </div>
                                        {!notification.read && (
                                            <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => handleMarkAsRead(notification.id)}>
                                                <Check className="h-3 w-3" />
                                                <span className="sr-only">Marcar como leída</span>
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </ScrollArea>
            </PopoverContent>
        </Popover>
    );
}
