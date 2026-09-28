/**
 * Presentaciones de producto para los tickets (línea de ítem).
 *
 * Fuente única de verdad compartida por el generador de HTML (`print-iframe.ts`),
 * la plantilla de React del POS (`receipt-template.tsx`) y la vista previa de
 * /settings/ticket, de modo que la vista previa y el papel impreso muestren
 * exactamente la misma línea.
 */

/** Unidades sin contenido comercial: no aportan información al cliente. */
const GENERIC_UNITS = ['ud', 'unidad', 'unid', 'un', 'pza', 'pz'];

/** Conector entre la presentación y el nombre del producto: "1 Paca de: AZUCAR". */
export const PRESENTATION_CONNECTOR = 'de:';

/** Quita los paréntesis que ya venían en el dato y colapsa espacios sobrantes. */
function unwrapUnit(unit: string): string {
    return unit.trim().replace(/^\((.*)\)$/, '$1').trim();
}

/** Compara textos ignorando mayúsculas, tildes y signos de puntuación. */
function foldText(value: string): string {
    return value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();
}

function isSameText(a: string, b: string): boolean {
    return foldText(a) === foldText(b);
}

/**
 * Presentación para la línea secundaria (Abajo del Nombre): se envuelve en
 * paréntesis para separarla visualmente del nombre del producto.
 */
export function formatUnitLabel(unit?: string | null): string | null {
    if (!unit) return null;
    const trimmed = unit.trim();
    if (!trimmed) return null;
    const lower = trimmed.toLowerCase();
    if (GENERIC_UNITS.includes(lower)) {
        return null;
    }
    if (trimmed.startsWith('(') && trimmed.endsWith(')')) {
        return trimmed;
    }
    return `(${trimmed})`;
}

/**
 * Presentación para la línea continua (En Línea con la Cantidad): sin
 * paréntesis ni cursiva, para que el texto fluya junto a la cantidad y al
 * nombre dentro de la misma línea. Los paréntesis que ya venían en el dato se
 * eliminan y las unidades genéricas ("ud", "unidad", "pza"...) se omiten.
 */
export function formatInlinePresentation(unit?: string | null): string | null {
    if (!unit) return null;
    const unwrapped = unwrapUnit(unit);
    if (!unwrapped) return null;
    if (GENERIC_UNITS.includes(unwrapped.toLowerCase())) {
        return null;
    }
    return unwrapped;
}

/**
 * Quita del nombre el prefijo que repite la presentación.
 * "Paca Azúcar Empacada" + "Paca" -> "Azúcar Empacada" (y si el nombre ya
 * traía el conector: "Paca de Azúcar" + "Paca" -> "Azúcar").
 * Devuelve el nombre original cuando la presentación no aparece al inicio.
 */
function stripLeadingUnitPrefix(name: string, presentation: string): string {
    const presentationWords = presentation.split(/\s+/).filter(Boolean);
    const nameWords = name.split(/\s+/).filter(Boolean);
    if (!presentationWords.length || nameWords.length < presentationWords.length) {
        return name;
    }
    const repeatsUnit = presentationWords.every((word, index) => isSameText(word, nameWords[index]));
    if (!repeatsUnit) {
        return name;
    }
    const rest = nameWords.slice(presentationWords.length).join(' ');
    // "Paca de Azúcar" + "Paca" no debe terminar en "Paca de: de Azúcar".
    return rest.replace(/^(?:de|del)\b[\s:]*\s*/i, '').trim();
}

export interface InlineItemText {
    /** Presentación con el conector ("Paca de:") o null si no hay presentación útil. */
    presentation: string | null;
    /** Nombre del producto, ya sin el prefijo de presentación repetido. */
    name: string;
}

/**
 * Construye la línea de producto del modo "En Línea con la Cantidad":
 * interpola el conector "de:" entre la presentación y el nombre y evita
 * repetir la presentación cuando el nombre del producto ya la incluye.
 *
 *   1 Paca de: AZUCAR EMPACADA           (Paca + "Paca Azúcar Empacada")
 *   1 Medio Quintal de: ARROZ 80/20      (presentación + nombre propio)
 *   1 Paca                                (el nombre era sólo la presentación)
 */
export function buildInlineItemText(description?: string | null, unit?: string | null): InlineItemText {
    const rawName = (description ?? '').toString().trim();
    const presentation = formatInlinePresentation(unit);
    if (!presentation) {
        return { presentation: null, name: rawName };
    }
    if (!rawName) {
        return { presentation, name: '' };
    }
    const name = stripLeadingUnitPrefix(rawName, presentation);
    // Nombre vacío o idéntico a la presentación: imprimirla una sola vez, sin "de:".
    if (!name || isSameText(name, presentation)) {
        return { presentation, name: '' };
    }
    return { presentation: `${presentation} ${PRESENTATION_CONNECTOR}`, name };
}
