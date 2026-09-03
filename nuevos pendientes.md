# Nuevos Pendientes

Funcionalidades potenciales a implementar en la app, organizadas por módulo.

## Pagos y Caja
- Conciliación con tarjeta: registrar marcas/IDs de transacción de tarjetas y conciliarlas al cierre de caja.
- Cierre de caja en PDF/Excel y envío automático por email.
- Control de gastos menores (petty cash) por cajero con aprobación de admin.
- Soporte de pagos mixtos (efectivo + tarjeta + crédito en una sola venta).

## Clientes / Crédito
- Historial de estados de cuenta descargable en PDF para el cliente.
- Alertas automáticas de límite de crédito al acercarse al tope.
- Cobradores / abonos programados y recordatorios de pagos vencidos.
- Categorías de clientes (mayorista, minorista, VIP) con precios y descuentos por defecto.

## Inventario / Productos
- Órdenes de compra automáticas cuando el stock baja del mínimo.
- Códigos de barras / QR en etiquetas para escaneo rápido en POS y recepción.
- Trazabilidad por lote y vencimiento con alertas de caducidad.
- Kardex en tiempo real y valoración de inventario por método (promedio, FIFO).
- Módulo de devoluciones a proveedor vinculado a cuentas por pagar.

## Ventas / POS
- Descuentos y promociones (por producto, combo, temporada).
- Devolución/nota de crédito: agregar reimpresión y anulación con motivo.
- Ventas rápidas sin inventario y apartados/encargos.
- Dashboard de metas de venta por vendedor/sucursal.

## Compras / Proveedores
- Cuentas por pagar con vencimientos, estados y reporte de antigüedad (aging).
- Sugerencia de proveedor por producto (precio/costo comparativo).
- Cotización de compras multi-proveedor para elegir la mejor opción.

## Reportes / Analítica
- Reportes comparativos (mes vs mes, año vs año) con gráficas.
- Análisis ABC de productos (mayor aporte de ingresos).
- Reportes de margen y rentabilidad por producto/categoría.
- Exportación a Excel/PDF desde todos los reportes.

## Notificaciones
- Notificaciones en tiempo real (stock bajo, vencimientos, créditos vencidos, pedidos nuevos).
- Envío por WhatsApp/email de facturas, estados de cuenta y avisos de cobro.

## Módulo de Reparto (rutero)
- Mapa de rutas con Google Maps para el repartidor.
- Confirmación de entrega con firma/foto en la app móvil.
- Reasignación y optimización de rutas.

## Seguridad y Administración
- Auditoría con IP y dispositivo de cada acción.
- Permisos granulares por rol (no solo admin vs no-admin): definir qué campo/acción puede cada rol.
- Bloqueo de cuenta y recuperación por clave de respaldo.
- Registro de intentos fallidos de login y alertas de actividad sospechosa.

## Joyería / Oro
- Seguimiento de transformaciones con reporte de merma y costo.
- Apartados (layaway) con pagos parciales y penalización por vencimiento.
- Control de reparaciones con estados y tiempos de entrega.

## Integraciones
- Respaldo automático de la base de datos en la nube (drive/S3).
- Multi-sucursal con transferencias de inventario entre locales.
- App móvil / PWA para POS y reparto.