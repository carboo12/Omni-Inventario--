// GENERADO AUTOMÁTICAMENTE. No editar.
// Wrappers de transporte para el módulo 'audit' (llaman a la API).
import { callAction } from '../api-client';

export async function logAuditEvent(...args: any[]): Promise<any> {
  return callAction('audit', 'logAuditEvent', args);
}

export async function recordAudit(...args: any[]): Promise<any> {
  return callAction('audit', 'recordAudit', args);
}

export async function getAuditLogs(...args: any[]): Promise<any> {
  return callAction('audit', 'getAuditLogs', args);
}
