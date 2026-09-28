// GENERADO AUTOMÁTICAMENTE. No editar.
// Wrappers de transporte para el módulo 'route-settlements' (llaman a la API).
import { callAction } from '../api-client';

import type { Prisma } from '@prisma/client';

import type { RouteSettlementRequest, RouteSettlementResult } from '../route-settlement';

export async function settleRouteOrder(request: RouteSettlementRequest): Promise<RouteSettlementResult> {
  return callAction('route-settlements', 'settleRouteOrder', [request]) as Promise<RouteSettlementResult>;
}
