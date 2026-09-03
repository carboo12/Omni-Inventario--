// GENERADO AUTOMÁTICAMENTE. No editar.
// Wrappers de transporte para el módulo 'license' (llaman a la API).
import { callAction } from '../api-client';

export async function checkLicenseStatus(...args: any[]): Promise<any> {
  return callAction('license', 'checkLicenseStatus', args);
}

export async function renewLicense(...args: any[]): Promise<any> {
  return callAction('license', 'renewLicense', args);
}

export async function activateInitialLicense(...args: any[]): Promise<any> {
  return callAction('license', 'activateInitialLicense', args);
}

export async function activateLicenseByKey(...args: any[]): Promise<any> {
  return callAction('license', 'activateLicenseByKey', args);
}
