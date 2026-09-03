'use server'
import { generateUUID } from '@/lib/uuid';

import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { verifySession } from '../session';

/**
 * Sube una imagen de producto al servidor
 */
export async function uploadProductImage(formData: FormData) {
    const session = await verifySession();
    if (!session) {
        return { success: false, error: 'No autorizado' };
    }

    const file = formData.get('image') as File;
    if (!file) {
        return { success: false, error: 'No se proporcionó ninguna imagen' };
    }

    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
        return { success: false, error: 'El archivo debe ser una imagen' };
    }

    // Validar tamaño (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
        return { success: false, error: 'La imagen es demasiado grande (máximo 5MB)' };
    }

    try {
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        const uploadDir = join(process.cwd(), 'public', 'uploads', 'products');
        
        // Asegurar que el directorio existe
        try {
            await mkdir(uploadDir, { recursive: true });
        } catch (e) {
            // Ya existe o error al crear
        }

        const filename = `${generateUUID()}-${file.name.replace(/\s+/g, '-')}`;
        const path = join(uploadDir, filename);

        await writeFile(path, buffer);
        
        // Retornar la URL pública
        const imageUrl = `/uploads/products/${filename}`;
        
        return { success: true, data: imageUrl };
    } catch (error) {
        console.error('Error uploading product image:', error);
        return { success: false, error: 'Error interno al subir la imagen' };
    }
}
