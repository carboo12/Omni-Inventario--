// GENERADO AUTOMÁTICAMENTE. No editar.
// Wrappers de transporte para el módulo 'receipt-settings' (llaman a la API).
import { callAction } from '../api-client';

// Tipos copiados del action original (para no arrastrar código server al bundle).
export interface ReceiptSettingsData {
    fontFamily: string;
    ticketWidth: string;
    lineHeight: number;
    paddingX: number;
    fontSizeTitle: number;
    fontSizeHeader: number;
    fontSizeBody: number;
    fontSizePresentation: number;
    fontSizeTotals: number;
    fontSizeFooter: number;
    presentationLayout: string;
    showLogo: boolean;
    showClientInfo: boolean;
    showEquivalenceUsd: boolean;
    footerMessage?: string | null;
}

export async function getReceiptSettings(...args: any[]): Promise<any> {
  return callAction('receipt-settings', 'getReceiptSettings', args);
}

export async function updateReceiptSettings(...args: any[]): Promise<any> {
  return callAction('receipt-settings', 'updateReceiptSettings', args);
}
