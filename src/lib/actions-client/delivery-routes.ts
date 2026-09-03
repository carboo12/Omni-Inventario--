// GENERADO AUTOMÁTICAMENTE. No editar.
// Wrappers de transporte para el módulo 'delivery-routes' (llaman a la API).
import { callAction } from '../api-client';

export async function getDeliveryRoutes(...args: any[]): Promise<any> {
  return callAction('delivery-routes', 'getDeliveryRoutes', args);
}

export async function getDeliveryRouteById(...args: any[]): Promise<any> {
  return callAction('delivery-routes', 'getDeliveryRouteById', args);
}

export async function createDeliveryRoute(...args: any[]): Promise<any> {
  return callAction('delivery-routes', 'createDeliveryRoute', args);
}

export async function updateRouteStatus(...args: any[]): Promise<any> {
  return callAction('delivery-routes', 'updateRouteStatus', args);
}

export async function updateStopStatus(...args: any[]): Promise<any> {
  return callAction('delivery-routes', 'updateStopStatus', args);
}

export async function getRuteros(...args: any[]): Promise<any> {
  return callAction('delivery-routes', 'getRuteros', args);
}
