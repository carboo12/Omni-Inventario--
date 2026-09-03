// GENERADO AUTOMÁTICAMENTE. No editar.
// Wrappers de transporte para el módulo 'jewelry-services' (llaman a la API).
import { callAction } from '../api-client';

// Tipos copiados del action original (para no arrastrar código server al bundle).
export interface JewelryServiceData {
    id: string;
    description: string;
    amount: number;
    createdAt: Date;
}

export async function createJewelryService(...args: any[]): Promise<any> {
  return callAction('jewelry-services', 'createJewelryService', args);
}

export async function getSessionServices(...args: any[]): Promise<any> {
  return callAction('jewelry-services', 'getSessionServices', args);
}
