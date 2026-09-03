// GENERADO AUTOMÁTICAMENTE. No editar.
// Wrappers de transporte para el módulo 'users' (llaman a la API).
import { callAction } from '../api-client';

import type { User, Prisma } from '@prisma/client';

export async function getUsers(...args: any[]): Promise<any> {
  return callAction('users', 'getUsers', args);
}

export async function getUserById(...args: any[]): Promise<any> {
  return callAction('users', 'getUserById', args);
}

export async function createUser(...args: any[]): Promise<any> {
  return callAction('users', 'createUser', args);
}

export async function updateUser(...args: any[]): Promise<any> {
  return callAction('users', 'updateUser', args);
}

export async function deleteUser(...args: any[]): Promise<any> {
  return callAction('users', 'deleteUser', args);
}
