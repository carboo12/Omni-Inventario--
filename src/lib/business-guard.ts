import db from "@/lib/db";
import { BusinessMode } from "@prisma/client";

export class BusinessGuard {
    /**
     * Obtiene el modo de negocio actual desde la base de datos de manera síncrona/segura
     * para funciones backend.
     */
    static async getCurrentMode(): Promise<BusinessMode> {
        const settings = await db.systemSettings.findFirst();
        return settings?.businessMode ?? 'PHARMACY';
    }

    /**
     * Verifica que la aplicación esté en el modo de negocio esperado.
     * Lanza un error si no coincide (útil para proteger rutas API).
     */
    static async assertMode(expectedMode: BusinessMode): Promise<void> {
        const currentMode = await this.getCurrentMode();
        if (currentMode !== expectedMode) {
            throw new Error(`Business Rule Violation: Expected mode ${expectedMode}, but current mode is ${currentMode}`);
        }
    }

    static async isJewelryMode(): Promise<boolean> {
        return (await this.getCurrentMode()) === 'JEWELRY';
    }

    static async isPharmacyMode(): Promise<boolean> {
        return (await this.getCurrentMode()) === 'PHARMACY';
    }

    static async isBoutiqueMode(): Promise<boolean> {
        return (await this.getCurrentMode()) === 'BOUTIQUE';
    }

    static async isDistribuidoraMode(): Promise<boolean> {
        return (await this.getCurrentMode()) === 'DISTRIBUIDORA';
    }
}