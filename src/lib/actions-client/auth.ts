// GENERADO AUTOMÁTICAMENTE. No editar.
// Wrappers de transporte para el módulo 'auth' (llaman a la API).
import { callAction } from '../api-client';

export async function checkUsersExist(...args: any[]): Promise<any> {
  return callAction('auth', 'checkUsersExist', args);
}

export async function registerFirstUser(...args: any[]): Promise<any> {
  return callAction('auth', 'registerFirstUser', args);
}

export async function loginUser(...args: any[]): Promise<any> {
  return callAction('auth', 'loginUser', args);
}

export async function logout(...args: any[]): Promise<any> {
  return callAction('auth', 'logout', args);
}

export async function getSession(...args: any[]): Promise<any> {
  return callAction('auth', 'getSession', args);
}

export async function resetPassword(...args: any[]): Promise<any> {
  return callAction('auth', 'resetPassword', args);
}
