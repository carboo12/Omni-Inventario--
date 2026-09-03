// GENERADO AUTOMÁTICAMENTE. No editar.
// Wrappers de transporte para el módulo 'notifications' (llaman a la API).
import { callAction } from '../api-client';

// Tipos copiados del action original (para no arrastrar código server al bundle).
export interface NotificationData {
    id: string;
    type: string;
    message: string;
    read: boolean;
    createdAt: Date;
    userId?: string | null;
}

export async function getNotifications(...args: any[]): Promise<any> {
  return callAction('notifications', 'getNotifications', args);
}

export async function markAsRead(...args: any[]): Promise<any> {
  return callAction('notifications', 'markAsRead', args);
}

export async function createNotification(...args: any[]): Promise<any> {
  return callAction('notifications', 'createNotification', args);
}

export async function notifyLowStock(...args: any[]): Promise<any> {
  return callAction('notifications', 'notifyLowStock', args);
}

export async function notifyExpiringProduct(...args: any[]): Promise<any> {
  return callAction('notifications', 'notifyExpiringProduct', args);
}

export async function notifyRegisterOpened(...args: any[]): Promise<any> {
  return callAction('notifications', 'notifyRegisterOpened', args);
}

export async function checkUnclosedBoxes(...args: any[]): Promise<any> {
  return callAction('notifications', 'checkUnclosedBoxes', args);
}
