// GENERADO AUTOMÁTICAMENTE. No editar.
// Wrappers de transporte para el módulo 'variants' (llaman a la API).
import { callAction } from '../api-client';

export async function getSizes(...args: any[]): Promise<any> {
  return callAction('variants', 'getSizes', args);
}

export async function createSize(...args: any[]): Promise<any> {
  return callAction('variants', 'createSize', args);
}

export async function getColors(...args: any[]): Promise<any> {
  return callAction('variants', 'getColors', args);
}

export async function createColor(...args: any[]): Promise<any> {
  return callAction('variants', 'createColor', args);
}

export async function generateCombinations(...args: any[]): Promise<any> {
  return callAction('variants', 'generateCombinations', args);
}
