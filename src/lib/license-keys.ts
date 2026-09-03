// Lista de licencias básicas (Permanentes Clásicas)
export const LICENSE_KEYS = [
    "ABC123DEF", "XYZ789GHI", "MNO456PQR", "STU123VWX", "YZA789BCD",
    "EFG456HIJ", "KLM123NOP", "QRS789TUV", "WXY456ZAB", "CDE123FGH"
];

// Lista de licencias anuales (1 Año)
export const ANNUAL_LICENSE_KEYS = [
    "ANV1-5829-XLZ", "ANV1-9472-MPK", "ANV1-3105-BWR", "ANV1-7684-DQT", "ANV1-2291-JSN",
    "ANV1-8530-HVG", "ANV1-4967-LFX", "ANV1-1742-KYZ", "ANV1-6318-PRM", "ANV1-5024-TWB"
];

// Lista de licencias premium (Permanentes Premium)
export const PREMIUM_LICENSE_KEYS = [
    "PREMIUM-2024-001", "PREMIUM-2024-002", "PREMIUM-2024-003", "PREMIUM-2024-004", "PREMIUM-2024-005",
    "PREMIUM-2024-006", "PREMIUM-2024-007", "PREMIUM-2024-008", "PREMIUM-2024-009", "PREMIUM-2024-010"
];

// Lista de licencias demo (15 Días)
export const DEMO_LICENSE_KEYS = [
    "DEMO-15D-001", "DEMO-15D-002", "DEMO-15D-003", "DEMO-15D-004", "DEMO-15D-005"
];

// Tipo de licencia demo (nuevo alias para el tipo de licencia de 15 días)
export type LicenseType = 'premium' | 'basic' | 'annual' | 'demo' | 'demo_15' | 'invalid';

/**
 * Expresión regular que reconoce claves de licencia Demo de 15 días.
 * Acepta los prefijos conocidos (DEMO-15D-XXX...) y el formato genérico DEMO-XXXX-XXXX
 * (p.ej: DEMO-15D-001, DEMO-1234-ABCD).
 */
export const DEMO_KEY_REGEX = /^DEMO-[0-9A-Z]{2,4}(?:-[0-9A-Z]{2,4})?$/i;

export const DEMO_KEY_PREFIX = 'DEMO';

/**
 * Determina si una clave corresponde al formato de licencia Demo.
 * @param key - Clave de licencia a verificar
 */
export function isDemoKey(key: string): boolean {
    const upperKey = key.trim().toUpperCase();
    return DEMO_LICENSE_KEYS.includes(upperKey) || upperKey.startsWith(DEMO_KEY_PREFIX);
}

/**
 * Verifica si una clave de licencia es premium
 * @param key - Clave de licencia a verificar
 * @returns true si la licencia es premium
 */
export function isPremiumLicense(key: string): boolean {
    return PREMIUM_LICENSE_KEYS.includes(key.toUpperCase());
}

export function isValidLicense(key: string): boolean {
    const upperKey = key.toUpperCase();
    if (LICENSE_KEYS.includes(upperKey)) return true;
    if (PREMIUM_LICENSE_KEYS.includes(upperKey)) return true;
    if (ANNUAL_LICENSE_KEYS.includes(upperKey)) return true;
    // Las claves demo aceptan tanto las listadas como el formato genérico DEMO-XXXX-XXXX
    return isDemoKey(upperKey);
}

/**
 * Obtiene el tipo de licencia
 * @param key - Clave de licencia
 * @returns 'premium' | 'basic' | 'annual' | 'demo' | 'demo_15' | 'invalid'
 */
export function getLicenseType(key: string): LicenseType {
    const upperKey = key.toUpperCase();
    if (PREMIUM_LICENSE_KEYS.includes(upperKey)) return 'premium';
    if (ANNUAL_LICENSE_KEYS.includes(upperKey)) return 'annual';
    if (isDemoKey(upperKey)) return 'demo_15';
    if (LICENSE_KEYS.includes(upperKey)) return 'basic';
    return 'invalid';
}

/**
 * Calcula la fecha de expiración de una licencia.
 * @param licenseType - Tipo de licencia
 * @param from - Fecha base (por defecto, ahora)
 * @param demoDays - Número de días de la licencia demo (por defecto 15)
 */
export function computeExpirationDate(
    licenseType: LicenseType,
    from: Date = new Date(),
    demoDays: number = 15
): Date {
    const expirationDate = new Date(from.getTime());
    if (licenseType === 'premium' || licenseType === 'basic') {
        expirationDate.setFullYear(from.getFullYear() + 100); // Permanente
    } else if (licenseType === 'annual') {
        expirationDate.setFullYear(from.getFullYear() + 1); // Anual
    } else if (licenseType === 'demo' || licenseType === 'demo_15') {
        expirationDate.setDate(from.getDate() + demoDays); // Demo de 15 días
    }
    return expirationDate;
}
