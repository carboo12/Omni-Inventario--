// GENERADO AUTOMÁTICAMENTE. No editar.
// Wrappers de transporte para el módulo 'categories' (llaman a la API).
import { callAction } from '../api-client';

// Tipos copiados del action original (para no arrastrar código server al bundle).
export type CategoryData = {
    name: string;
    description?: string | null;
    inventoryType: 'pharmacy' | 'general';
    parentId?: string | null;
}

export type CategoryWithChildren = {
    id: string;
    name: string;
    description: string | null;
    parentId: string | null;
    children: CategoryWithChildren[];
    _count?: {
        product: number;
        other_category?: number;
    }
}

export async function getCategories(...args: any[]): Promise<any> {
  return callAction('categories', 'getCategories', args);
}

export async function getCategoryTree(...args: any[]): Promise<any> {
  return callAction('categories', 'getCategoryTree', args);
}

export async function createCategory(...args: any[]): Promise<any> {
  return callAction('categories', 'createCategory', args);
}

export async function updateCategory(...args: any[]): Promise<any> {
  return callAction('categories', 'updateCategory', args);
}

export async function deleteCategory(...args: any[]): Promise<any> {
  return callAction('categories', 'deleteCategory', args);
}
