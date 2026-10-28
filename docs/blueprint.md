# **Blueprint Técnico y de Producto: JoyeriaPlus**

> **Sistema de Gestión Empresarial (ERP) y Punto de Venta (POS) Especializado en Joyerías y Adaptable Multi-Negocio**

---

## 1. Visión General y Resumen Ejecutivo

**JoyeriaPlus** es una plataforma integral de gestión comercial, punto de venta y control de inventarios desarrollada para operantes de joyería de alta precisión (compra de oro por quilates/gramos, tasa de mercado en tiempo real, fundición, empeños/apartados y taller de reparaciones), manteniendo al mismo tiempo un núcleo flexible **multi-negocio** capaz de operar bajo las modalidades de **Farmacia**, **Boutique** y **Distribuidora**.

### Características Destacadas:
- **Tasación de Oro de Mostrador**: Motor de cálculo en tiempo real basado en la cotización internacional de la Onza Troy en USD, conversión a gramos/quilates, tipo de cambio dinámico y márgenes parametrizables.
- **Ciclo Completo de Joyería**: Compra de pedacería/oro bruto a clientes, fundición/traslado a bóveda virtual, producción de piezas terminadas con mano de obra y gestión de apartados (`Layaway`) / reparaciones (`RepairOrder`).
- **Soporte Multimoneda Nativo**: Transacciones simultáneas en **Córdoba Nicaragüense (C$ NIO)** y **Dólar Estadounidense ($ USD)** con conversión automática y arqueo de caja segregado por moneda.
- **Punto de Venta (POS) & Sesión de Caja**: Control estricto de turnos de cajero con apertura, egresos/retiros de efectivo, notas de crédito, cobros con tarjeta, crédito o abonos, y arqueo ciego final.
- **Matriz de Variaciones (Boutique)**: Gestión de productos por Talla (`Size`) y Color (`Color`) con código de barras y stock independiente por variante.
- **Control de Lotes & Vencimientos (Farmacia)**: Lógica de despacho FEFO (First Expired, First Out) / FIFO.
- **Rutas de Distribución & Ruteros**: Gestión de pedidos de clientes, asignación de rutas de entrega, control de visitas por dirección y cobro en campo.
- **Granos Básicos & Venta Fraccionada**: Ventas por unidad/libra o por empaque (paca/saco/quintal), precios por niveles (Detalle/Mayorista/Paca/Quintal), cantidades decimales y descuento de stock por factores de conversión.
- **Flujo Despachador → Cajero**: Vista mobile-first del despachador para toma de comandas (`HeldSale`) con botón `COBRAR (C$ total)`, cliente opcional (por defecto "CLIENTE GENERAL"), y listado de pendientes en caja con `Comanda #`, despachador, total, hora/fecha y cliente.
- **Crédito & Cuentas por Cobrar (CxC)**: Ventas a crédito con **autorización de administrador** en caja, saldo pendiente por cliente, abonos con recibo impreso y reporte de **Antigüedad de Cuentas por Cobrar** (cartera por rangos de días) con tarjeta de abonos en el reporte de ventas.
- **Módulo Opcional de Recetas (BOM)**: Productos clasificados como **Materia Prima (`INGREDIENT`)** o **Platillo Preparado (`RECIPE_ITEM`)** con receta/costeo de insumos, calculadora de margen y precio sugerido, y descuento automático de la materia prima al vender platillos en el POS (controlado por `enableRecipes`).
- **Seguridad & Auditoría Inmutable**: Control de Acceso Basado en Roles (RBAC) por rutas, hash de contraseñas Bcrypt, tokens JWT y registro de auditoría (`AuditLog`) de acciones sensibles.
- **SPA Ligera + API desacoplada**: Frontend React compilado con Vite y API REST (Hono) reutilizando la lógica de acciones de negocio mediante un dispatcher genérico.

---

## 2. Arquitectura Tecnológica & Stack de Desarrollo

```
 ┌────────────────────────────────────────────────────────────────────────┐
 │                              CLIENT (UI)                               │
 │   React 18 + Vite 7 (SPA) + Tailwind CSS + Radix UI                    │
 │   TanStack Router + TanStack Query + shadcn/ui                         │
 └───────────────────────────────────┬────────────────────────────────────┘
                                     │  HTTP (dev: proxy Vite /api/actions)
                                     ▼
 ┌────────────────────────────────────────────────────────────────────────┐
 │                          API REST (Hono)                               │
 │   Dispatcher genérico: POST /api/actions/:module/:fn                   │
 │   Reutiliza los action modules del dominio vía shims de compatibilidad │
 └───────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     ▼
 ┌────────────────────────────────────────────────────────────────────────┐
 │                         BUSINESS & DOMAIN LOGIC                        │
 │  • GoldPricingEngine  • JewelrySalesService  • JewelryProductionEngine │
 │  • BusinessGuard (contexto multi-negocio)                              │
 └───────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     ▼
 ┌────────────────────────────────────────────────────────────────────────┐
 │                          DATA ACCESS & STORAGE                         │
 │   Prisma ORM 5.22 ──► MySQL (Base de Datos Relacional Central)          │
 └────────────────────────────────────────────────────────────────────────┘
```

| Capa | Tecnología / Herramienta | Descripción / Propósito |
| :--- | :--- | :--- |
| **Framework Frontend** | `React 18.3.1` + `Vite 7.3` | SPA de alta reactividad; Vite se encarga del build, HMR y servidor de desarrollo. |
| **Enrutado (SPA)** | `TanStack Router 1.170` | Router basado en estado; el proyecto usa un *catch-all* + registro de páginas por path (`pages-registry`). |
| **Datos en Cliente** | `TanStack Query 5.102` | Cache, revalidación y estados de carga/error para cada página y query. |
| **Estilos & UI** | `Tailwind CSS 3.4` + `Radix UI` | Sistema de diseño modular (componentes `shadcn/ui`), accesible y responsive con estética oscura/dorada. |
| **Iconografía & Gráficos** | `Lucide React` + `Recharts` | Conjunto de iconos vectoriales modernos y gráficos financieros interactivos. |
| **API Backend** | `Hono 4.13` + `@hono/node-server` | Servidor HTTP en Node; expone un dispatcher genérico de acciones (`/api/actions/:module/:fn`). |
| **Base de Datos** | `MySQL` vía `@prisma/client 5.22` | Motor relacional para almacenamiento persistente con transacciones ACID. |
| **Autenticación & Sesión** | `jose` (JWT) + `bcryptjs` | Tokens JWT sin estado y hash de contraseñas; cookies de sesión con `HttpOnly`. |
| **Validación de Datos** | `Zod 3.24` + `React Hook Form` | Validación estricta de formularios en cliente y servidor. |
| **Pruebas Unitarias** | `Vitest 1.6` + `@testing-library/react` | Suite de pruebas para motores de cálculo y lógica de negocio. |
| **Despliegue Local / Red** | `Node.js` + `PM2` / Scripts `.ps1` / `.bat` | Ejecución resiliente en red local con auto-reanimación de procesos. |

### Modos de Ejecución
| Comando | Descripción |
| :--- | :--- |
| `npm run dev` | Arranca en paralelo la API (Hono, puerto `9003`) y Vite (puerto `5173`) vía `scripts/dev.mjs`. Vite hace proxy de `/api/actions` hacia la API. |
| `npm run build` | `vite build` (estáticos → `dist/`) + `build-server` (API → `dist-server/index.mjs`). |
| `npm start` | Ejecuta la API de producción (`dist-server/index.mjs`), que también sirve los estáticos del frontend en el mismo origen. |
| `npm run generate` | Regenera `action-modules`, `actions-client` y `pages-registry` a partir del código fuente. |

### Despliegue de producción en Windows (`deploy.bat`)

- `deploy.bat` solo despliega desde la rama `main`, exige un árbol Git limpio y actualiza con `git pull --ff-only origin main`; si detecta cambios locales o un error, aborta antes de continuar.
- La secuencia (8 pasos) instala exactamente `package-lock.json` con `npm ci`, valida Prisma, genera el cliente, ejecuta `prisma migrate deploy` y `prisma migrate status`, ejecuta el saneamiento de crédito (`npm run db:sanitize-credit`), compila con `npm run build` (Vite y `dist-server/index.mjs`), y reinicia únicamente `omni-pos` desde `ecosystem.config.cjs` con `PORT=9003`.
- **Paso de saneamiento integrado:** entre la sincronización de BD y la compilación, `deploy.bat` ejecuta `npm run db:sanitize-credit` (`scripts/sanitize-credit-reconciliation.ts`) para reconciliar facturas/cuotas de crédito saldadas del historial previo. Es idempotente y solo afecta facturas a crédito; nunca toca ventas de contado.
- El flujo no ejecuta `prisma db push --accept-data-loss` ni continúa después de errores de migración/build. Los artefactos requeridos (`dist/index.html` y `dist-server/index.mjs`) deben existir antes de que PM2 arranque la aplicación.
- Tras iniciar, el script conserva/configura la tarea de autoarranque `omni-pos-Autostart` con `setup-autostart.ps1` cuando aún no existe y consulta `http://127.0.0.1:9003/health` hasta 30 segundos. Si el servicio falla, imprime `pm2 logs omni-pos --lines 100 --nostream`; para diagnóstico manual use `pm2 list`, `pm2 logs omni-pos --lines 100` y `curl.exe http://127.0.0.1:9003/health`.
- `ecosystem.config.cjs` ejecuta `dist-server/index.mjs` desde la raíz del repositorio, con reinicio automático, sin `watch`, y registra los logs en `logs/out.log` y `logs/error.log`.
- **Ventana de mantenimiento:** la configuración actual de PM2 es un único proceso `fork`. En Windows se detiene antes de `npm ci`/`prisma generate` para evitar reemplazos fallidos del cliente Prisma bloqueado por el backend. Este despliegue seguro ocasiona una interrupción breve y no equivale a cero downtime; para lograrlo se requiere una estrategia de despliegue blue/green o instancias en clúster con artefactos/dependencias aislados.

### Actualización 2026-10-27: Cliente asignado al cargar un pedido/comanda en el POS

- **Bug corregido:** al cargar en caja un pedido pendiente o una comanda que ya tenía cliente asignado, el POS restauraba únicamente `customerName`; `selectedClient` quedaba en `null` y el botón **Venta a Crédito** aparecía deshabilitado aunque el cliente tuviera `hasCredit = true`. El cajero debía volver a buscar y seleccionar el cliente para habilitarlo.
- **Resolución del cliente (`getCustomerForPOSCheckout`):** nueva acción de solo lectura en `src/lib/actions/customers.ts`. Si la comanda tiene `orderId`, obtiene el cliente exacto mediante la relación `CustomerOrder.customer`; si solo guardó el nombre (comandas directas del despachador), lo resuelve por nombre **únicamente cuando hay una coincidencia única**, evitando asignar crédito a un homónimo.
- **Hidratación del POS:** `resolveSelectedClientForSale` en `src/app/(app)/pos/client.tsx` reconstruye `selectedClient` con `id`, `name`, `phone`, `address`, `priceLevel`, `interestRate` y **`hasCredit`**. Se invoca al vincular la comanda activa ("Cargar en POS"), al cargar una comanda desde la cola (`handleLoadComanda`) y al recuperar una factura en espera (`handleResumeBill`), tanto en `CashierPOS` como en `CashierOnlyPOS`.
- **Recalculado inmediato:** al actualizar `selectedClient`, `PaymentGrid` recibe `customerHasCredit` en el mismo render y habilita **Venta a Crédito** sin intervención manual. Si el nombre es genérico o hay homónimos, no se autoasigna y el cajero debe elegir la ficha.
- **Wrapper de transporte:** se regeneró `src/lib/actions-client/customers.ts` con `getCustomerForPOSCheckout` para que el alias de Vite resuelva la nueva acción en el bundle del cliente.
- **Sin cambios** en la plantilla/impresión de tiquetes (`print-iframe.ts`), ventas, caja, existencias, stock de inventario ni Kardex.

### Actualización 2026-10-27: Procedimiento definitivo de actualización en producción (`update.bat` + reparador de índices)

- **Alcance:** este es el procedimiento estándar e infalible para actualizar cualquier máquina de producción que recibe el proyecto como copia manual (sin carpeta `.git`). `deploy.bat` sigue siendo el flujo formal basado en Git; `update.bat` es el mantenimiento autónomo con `prisma db push`.
- **Requisito previo:** abrir `.env` y confirmar `DATABASE_URL="mysql://USUARIO:CONTRASEÑA@localhost:3306/farmacia"` (codificar caracteres especiales: `+` → `%2B`, `@` → `%40`, `#` → `%23`, `/` → `%2F`, `:` → `%3A`, `%` → `%25`). Luego ejecutar `update.bat` con doble clic.
- **Secuencia blindada (8 pasos, orden obligatorio):**
  1. `pm2 stop omni-pos` — libera bloqueos de archivos/DLL del `query_engine` de Prisma en Windows. Si la app no está registrada, el script informa y continúa.
  2. `npm install --prefer-offline --no-audit --no-fund` — instalación rápida sin auditoría ni descargas innecesarias.
  3. `npx prisma generate` — regenera `@prisma/client` antes de cualquier reparación o sincronización.
  4. `node scripts/fix-credit-note-index.mjs` — repara la colisión UNIQUE/FK de `CreditNote` (y cualquier patrón equivalente) antes de `db push`.
  5. `npx prisma db push --accept-data-loss` — sincroniza el esquema completo (tablas `employee*`, columnas nuevas, etc.).
  6. `npm run db:sanitize-credit` — reconcilia facturas/cuotas de crédito; solo toca crédito y es idempotente. Sus avisos no bloquean.
  7. `npm run build` — compila Vite y `dist-server/index.mjs`; verifica que existan ambos artefactos.
  8. `pm2 restart omni-pos --update-env` + `pm2 save --force` — deja la aplicación en línea y persiste el estado. Si `omni-pos` no estaba registrado, arranca desde `ecosystem.config.cjs` con `--env production`.
- **Reparador de índices 100% dinámico (`scripts/fix-credit-note-index.mjs`):** no hardcodea el nombre de la FK. Antes de tocar `CreditNote`, consulta `information_schema.KEY_COLUMN_USAGE` y `REFERENTIAL_CONSTRAINTS` para obtener el nombre real de la FK (por ejemplo `CreditNote_invoiceId_fkey` o cualquier variante instalada en producción), la tabla/columna destino y las reglas `ON DELETE` / `ON UPDATE`. Después crea el índice no único declarado por `schema.prisma` (`CreditNote_invoiceId_idx` o un nombre libre determinista), elimina el UNIQUE obsoleto y, si MySQL aún exige la FK, la elimina y recrea con su nombre real y reglas originales. Verifica el resultado con una nueva lectura de `information_schema` antes de informar éxito. Es idempotente y admite `--dry-run` / `--db-url=`.
- **Validación del reparador:** probado contra MySQL/MariaDB local con un índice UNIQUE y una FK de nombres no estándar; detectó la FK real, conservó `ON DELETE` / `ON UPDATE`, creó el índice no único, eliminó el UNIQUE y una segunda ejecución reportó 0 colisiones (idempotencia).
- **Manejo de errores:** los pasos 4 y 6 no son bloqueantes (advertencia y continúan); los pasos 2, 3, 5, 7 y 8 sí detienen el flujo. Ante fallo de MySQL/`P1000`, `update.bat` muestra la ayuda de `DATABASE_URL`, ejecuta `node scripts/verify-db-connection.mjs` e intenta reactivar `omni-pos` con la versión anterior si los artefactos existen. Todos los errores terminan con `pause` para que la ventana no se cierre.
- **Integridad:** este procedimiento no modifica la plantilla/impresión de tiquetes (`print-iframe.ts`), ventas, caja, existencias, stock de inventario ni Kardex.

### Actualización 2026-10-08: Ruta administrativa de Pedidos

- Con `enableDeliveryRoute` activado, el enlace **Pedidos** apunta a `/orders` y carga la vista de gestión de `src/app/(app)/orders/client.tsx`; **Rutas de Reparto** apunta a `/delivery-routes`.
- Con `enableDeliveryRoute` desactivado, el menú oculta Pedidos, Rutas de Reparto, Ruta & Entregas y Cobros para todos los roles. El guard de `src/router.tsx` bloquea también el acceso directo y redirige administradores a `/dashboard`, nunca a `/pos`.
- El clic de **Pedidos** y **Rutas de Reparto** despacha explícitamente la navegación SPA; la acción de cargar un pedido en caja permanece dentro del detalle del pedido.

### Actualización 2026-10-19: Corrección de cuotas residuales y bloqueo de crédito en POS
- **Bug corregido (deadlock de crédito):** al registrar abonos parciales sobre ventas con financiamiento, cada cuota (`CreditInstallment`) conservaba su monto original aunque recibiera dinero. Un abono de $500 sobre una cuota de $333.33 desviaba fondos de la siguiente cuota y dejaba la última cuota `PENDING` con saldo residual. Esa cuota vencida hacía que `createSale` (`src/lib/actions/sales.ts`) exigiera autorización de administrador (`overdueCount > 0`) incluso con el cliente a $0.00 de deuda, y el guard de sobrepago impedía abonar el residuo porque `currentBalance` ya era 0.
- **Abono parcial FIFO corrige el remanente:** `applyPaymentToInvoices` (`src/lib/actions/customers.ts`) ahora deduce el monto aplicado del `amount` de la cuota; si el remanente llega a ≤ C$ 0.005, la cuota se marca `amount: 0` y `status: 'PAID'`. Un pago parcial deja la cuota `PENDING` con el saldo restante real, no con el monto original.
- **Facturas liquidadas:** al abonar, `SalesInvoice.pendingBalance` se decrementa y, cuando llega a 0, la factura se actualiza formalmente a `status: 'PAID'` (Pasada 1 y 2 de `applyPaymentToInvoices`). En `createSale`, la venta a crédito con `financedTotal ≤ 0.005` también se liquida como `PAID`.
- **Validación de mora endurecida:** la consulta de cuotas vencidas en `createSale` (`src/lib/actions/sales.ts`) cuenta únicamente cuotas activas con saldo real (`amount: { gt: 0.005 }`) y cuya factura (`salesInvoice`) aún tenga `pendingBalance > 0.005`, por lo que las cuotas liquidadas y las de facturas ya saldadas dejan de bloquear. El límite de crédito se libera automáticamente al llegar a $0.00 de deuda, incluso con datos residuales previos.
- **Resolución de cliente por ID en POS:** `handleSuccessfulPayment` (`src/app/(app)/pos/client.tsx`) usa `selectedClient.id` cuando hay una ficha seleccionada, en lugar de volver a buscar/crear por nombre; solo recurre a `searchOrCreateCustomer` cuando no hay cliente seleccionado. Esto evita aplicar abonos a un registro distinto al facturado cuando existen clientes con el mismo nombre.
- **Sin cambios** en la plantilla/impresión de tiquetes (`print-iframe.ts`), existencias, stock ni Kardex.

### Actualización 2026-10-19: Saneamiento de historial de crédito (reconciliación de cuotas/facturas)
- **Script único:** `scripts/sanitize-credit-reconciliation.ts`, ejecutable con `npm run db:sanitize-credit` (admite `--dry-run` para previsualizar sin escribir). Reconfigura en una sola transacción el historial dejado por el bug de cuotas residuales.
- **Alcance (solo facturas a crédito):** identifica facturas cuyo método de pago clasifica como crédito (`isCreditPayment` de `src/lib/payment-method.ts`) y cuyo `pendingBalance ≤ 0.005`. A esas facturas las marca `status: 'PAID'` y `pendingBalance: 0`. **No toca las ventas de contado** (`COMPLETED`), que los reportes y la caja siguen filtrando por `status: 'COMPLETED'` (`src/lib/actions/reports.ts`, `src/lib/actions/sales.ts`).
- **Cuotas:** marca `status: 'PAID'` y `amount: 0` a toda cuota (`CreditInstallment`) que pertenezca a una factura de crédito ya saldada o cuyo `amount ≤ 0.005` (incluidas las que ya estaban `PAID` pero conservaban monto). Con esto ninguna cuota residual puede disparar la alerta de mora en `createSale`.
- **Ejecución registrada (base `DATABASE_URL`):** dry-run previo detectó 3 facturas a crédito saldadas en `COMPLETED` (#1439 con residuo flotante `1.42e-14`, #1292 y #1451 con `pendingBalance = 0`) y 7 cuotas a reconciliar (3 de ellas `PENDING` con `amount = 15` pertenecientes a facturas ya pagadas). La aplicación actualizó 3 facturas y 7 cuotas; verificación posterior: **0 cuotas activas con `amount ≤ 0.005`** y **0 facturas de crédito no liquidadas con saldo**. Una segunda ejecución `--dry-run` devolvió 0 pendientes (script idempotente).
- **Sin cambios** en la lógica del fix (`customers.ts` / `sales.ts` / POS), en la impresión de tiquetes, inventario, stock ni Kardex.

### Actualización 2026-10-19: Auditoría de despliegue y script `update.bat`

- **Auditoría pre-despliegue (entorno local):** `npx tsc --noEmit` no reporta errores en los módulos intervenidos (`customers.ts`, `sales.ts`, `pos/client.tsx`, `sanitize-credit-reconciliation.ts`); los errores restantes son pre-existentes y ajenos a estos cambios. `npm run build` compila correctamente y genera `dist/index.html` y `dist-server/index.mjs`.
- **Prueba de humo Hono (bundle `dist-server/index.mjs`, puerto aislado):** `/health` responde `200 {"ok":true}`. Las rutas nuevas responden **200 (no 404)** conservando el guard de sesión: `POST /api/actions/credit-notes/getCreditNotes`, `POST /api/actions/employees/getEmployeeLoanHistory`, `POST /api/actions/employees/getEmployeePayrollHistory` y `POST /api/actions/reports/getTicketHistory` devuelven `{ success:false, error:"No autorizado", data:[] }` sin sesión válida. Las rutas de historiales de personal se registran dinámicamente (`registerEmployeeHistoryRoute`) y también están en el dispatcher genérico (`employees.*`); `getCreditNotes` y `getTicketHistory` tienen ruta explícita en `server/dispatcher.ts` y están en `server/action-modules.ts` (`credit-notes`, `employees`, `reports`).
- **HISTÓRICO (sustituido el 2026-10-27 por la secuencia blindada de 8 pasos):** `update.bat` es mantenimiento y actualización continua autónoma (no requiere rama limpia ni `git pull`). La versión original tenía 6 pasos: (1) `npm ci`; (2) `npx prisma generate` + `npx prisma db push --accept-data-loss`; (3) `npm run db:sanitize-credit` (advertencia no bloqueante); (4) `npm run build` con verificación de `dist/index.html` y `dist-server/index.mjs`; (5) reinicio de `omni-pos` en PM2 con `--update-env` (y `startOrRestart ecosystem.config.cjs` como respaldo si la app no estaba registrada); (6) `npx pm2 save --force`. Ante un error crítico en dependencias/DB/build detiene el flujo e imprime `pm2 logs omni-pos --lines 60 --nostream`.
- **Diferencia con `deploy.bat`:** `deploy.bat` es el despliegue formal desde `main` con árbol limpio y migraciones versionadas (`prisma migrate deploy`); `update.bat` es el mantenimiento rápido en la máquina de producción que usa `prisma db push` (sin historial de migraciones) y es idempotente.
- **Sin cambios** en la plantilla/impresión de tiquetes (`print-iframe.ts`), ventas, caja, existencias, stock ni Kardex.

### Resolución de problemas: tablas/columnas faltantes en producción

- **Síntoma:** la API responde `The table 'employee' does not exist in the current database` (o falta una columna como `unitsPerBulk`). Esto significa que `npx prisma db push` **no se ejecutó** contra MySQL; la causa habitual es que la autenticación falló antes (error **P1000: Authentication failed**).
- **Regla obligatoria:** ante cualquier error de tabla o columna faltante en la máquina de producción, **verifique primero el archivo `.env`** (variable `DATABASE_URL`) antes de tocar código.
- **Formato esperado:** `DATABASE_URL="mysql://USUARIO:CONTRASEÑA@HOST:3306/BASE_DE_DATOS"`.
- **Contraseñas con caracteres especiales** deben ir codificadas en URL: `+` → `%2B`, `@` → `%40`, `#` → `%23`, `/` → `%2F`, `:` → `%3A`, `%` → `%25`.
- **Diagnóstico automático:** si `prisma db push` falla, `update.bat` salta a la etiqueta `:ERROR_DB`, muestra `[ERROR CRITICO DE CONEXION DE BASE DE DATOS]` con la instrucción de revisar `DATABASE_URL`, y ejecuta `node scripts/verify-db-connection.mjs` para mostrar el detalle exacto de la conexión.
- **Verificación manual:** ejecute `verify-db.bat` (o `node scripts/verify-db-connection.mjs`) para comprobar la conexión a MySQL sin desplegar; luego vuelva a correr `update.bat`.
- **Alcance:** este diagnóstico solo corrige la conexión de BD. No modifica la plantilla/impresión de tiquetes (`print-iframe.ts`), ventas, caja, existencias, stock ni Kardex.

### Resolución de problemas: `Cannot drop index 'CreditNote_invoiceId_key'`

- **Síntoma:** `prisma db push` aborta con `Error: Cannot drop index 'CreditNote_invoiceId_key': needed in a foreign key constraint`, impidiendo sincronizar la tabla `employee` y la columna `product.unitsPerBulk`.
- **Causa raíz:** la migración histórica `20251209073940_add_actual_usd_to_cash_register` creó `CreditNote` como relación 1-a-1 (`UNIQUE INDEX CreditNote_invoiceId_key` + FK `CreditNote_invoiceId_fkey`). MySQL reutiliza ese índice UNIQUE para satisfacer la FK. El `schema.prisma` actual modela `SalesInvoice.creditNote` como `CreditNote[]` (1-a-muchos) y solo declara un índice **no único** (`@@index([invoiceId], map: "CreditNote_invoiceId_idx")`). Prisma intenta eliminar el índice UNIQUE para alinear con el schema, pero MySQL lo rechaza porque la FK depende de él. Por eso **no es un error de credenciales (`P1000`), sino una colisión de índice/FK**.
- **Reparación automatizada (dinámica):** `scripts/fix-credit-note-index.mjs` (`npm run db:fix-credit-index`, admite `--dry-run` y `--db-url=`). Es **totalmente dinámico**: (1) lee `schema.prisma` para conocer qué índices son NO únicos según el modelo actual; (2) consulta `information_schema` de la **BD destino** (`DATABASE_URL`) para descubrir los nombres **exactos** de índices y FKs —sin hardcodear sufijos que varían en producción—; (3) para cada columna de FK respaldada únicamente por un índice UNIQUE que el schema ya no declara único, crea el índice no único declarado (o uno determinista `<Tabla>_<col>_idx`) y elimina el UNIQUE obsoleto. Antes de cada DROP revalida en `information_schema` el nombre real de la FK y sus reglas `ON DELETE` / `ON UPDATE`; si MySQL aún la exige, la elimina y la recrea con ese nombre y reglas originales. Verifica el estado final (índice no único presente + FK activa) y es idempotente y sin pérdida de datos. No importa `@prisma/client` en el proceso principal (ejecuta las consultas en subprocesos) para evitar el lock EPERM del `query_engine` DLL en Windows.
- **Alcance dinámico probado:** en la copia de producción `farmacia2` el script detectó **1** colisión (`creditnote.invoiceId`). Las tablas `accountspayable` y `routesettlement` **también** tienen un índice UNIQUE + FK sobre `invoiceId`, pero **no** son colisión porque su modelo en `schema.prisma` los declara `@unique` (`AccountsPayable.invoiceId`, `RouteSettlement.invoiceId`); Prisma no intenta eliminar esos índices. El script distingue correctamente ambos casos evitando tocar lo que el schema sí quiere único.
- **Integración:** `update.bat` ejecuta `node scripts/fix-credit-note-index.mjs` (equivalente a `npm run db:fix-credit-index`) como paso 4, justo antes de `npx prisma db push --accept-data-loss` (paso 5); la reparación es no bloqueante (si reporta avisos, el push continúa y, si falla, salta a `:ERROR_DB`).
- **Equivalente SQL manual** (si se prefiere aplicar a mano en MySQL):
  ```sql
  CREATE INDEX `CreditNote_invoiceId_idx` ON `CreditNote`(`invoiceId`);
  ALTER TABLE `CreditNote` DROP INDEX `CreditNote_invoiceId_key`;
  ```
- **Verificación:** tras la reparación, `npx prisma db push --accept-data-loss` responde `Your database is now in sync with your Prisma schema` y quedan creadas la tabla `employee` (con `employeeloan`, `employeeabsence`, `payrollrecord`, `employeeloanpayment`) y la columna `product.unitsPerBulk`.
- **Alcance:** solo cambia índices/estructura de BD. No modifica la plantilla/impresión de tiquetes (`print-iframe.ts`), ventas, caja, existencias, stock ni Kardex.

### Actualización 2026-10-19: Auditoría y simulación sobre la copia de producción `farmacia2`

- **Contexto:** se restauró la copia exacta de producción como base `farmacia2` en la máquina local. La auditoría se ejecutó **solo** contra `farmacia2` (vía `DATABASE_URL`/`--db-url`), sin alterar la base de desarrollo `farmacia`.
- **Reproducción del fallo:** `npx prisma db push --accept-data-loss` contra `farmacia2` abortó con la traza idéntica a producción: `Error: Cannot drop index 'CreditNote_invoiceId_key': needed in a foreign key constraint` en el paso `DropIndex { index_id: IndexId(23) }`.
- **Hallazgos del estado inicial de `farmacia2`:** `product.unitsPerBulk` ya existía, pero **faltaban** las tablas `employee*` — exactamente el síntoma de producción (`The table 'employee' does not exist`). `CreditNote` tenía `UNIQUE KEY CreditNote_invoiceId_key (invoiceId)` + `CONSTRAINT CreditNote_invoiceId_fkey`. Nota: en esta copia las FK de `creditnote` referencian `farmacia`.`salesinvoice` (referencias cruzadas entre esquemas heredadas del dump), lo que no impide la reparación porque se opera por nombre de índice/FK del esquema destino.
- **Otras colisiones potenciales revisadas:** `accountspayable.AccountsPayable_invoiceId_key` y `routesettlement` también presentan UNIQUE+FK, pero **no** requieren reparación (declarados `@unique` en el schema). Se descartaron dinámicamente.
- **Resultado tras la reparación dinámica en `farmacia2`:** `prisma db push` reportó `Your database is now in sync with your Prisma schema` (exit 0); se confirmó la creación de `employee`, `employeeabsence`, `employeeloan`, `employeeloanpayment`, `payrollrecord`, la presencia de `product.unitsPerBulk` y el índice final `CreditNote_invoiceId_idx` (no único). Una segunda ejecución del script reportó 0 colisiones (idempotente).
- **Alcance:** auditoría de índices/estructura exclusivamente. No se modificó la plantilla/impresión de tiquetes (`print-iframe.ts`), ventas, caja, existencias, stock ni Kardex, ni la base `farmacia`.

### Actualización 2026-10-19: Diagnóstico, Reparación y Optimización de Scripts de Despliegue (`deploy.bat` y `update.bat`)

- **Diagnóstico del cierre inmediato en `deploy.bat`:**
  - **Causa raíz:** `deploy.bat` contenía instrucciones `exit /b 1` y `exit /b 0` sin `pause` en todas sus salidas. En el servidor de producción o entornos con cambios locales no confirmados (logs, dist, .env), la validación `git status --porcelain` saltaba a `:dirty_worktree` y cerraba la consola en milisegundos sin permitir leer el motivo. Además, la comprobación estricta `where pm2` fallaba sin pausa cuando PM2 no estaba en el `PATH` global del usuario.
  - **Reparación aplicada:**
    - Inicio normalizado con `@echo off` y `cd /d "%~dp0"` para garantizar el contexto del directorio de trabajo.
    - Detección adaptable de PM2: si `pm2` no está en `PATH`, conmuta a `npx pm2` automáticamente sin abortar.
    - Enriquecimiento de mensajes de diagnóstico en pre-requisitos (`git`, `node`, `npm`, `pm2`, rama `main`, árbol sucio). Si hay cambios locales, informa detalladamente y sugiere usar `update.bat`.
    - Adición obligatoria de la instrucción `pause` antes de cualquier `exit /b 0` o `exit /b 1` en **todos** los puntos de salida.
    - Codificación verificada en UTF-8 sin BOM para evitar errores de interpretación en `cmd.exe`.

- **Aceleración y optimización de rendimiento en `update.bat`:**
  - **Eliminación del cuello de botella en `npm`:** se sustituyó el destructivo y lento `npm ci` (que eliminaba y descargaba de cero todo `node_modules`) por `npm install --prefer-offline --no-audit --no-fund`. La validación de dependencias se redujo de varios minutos a ~3 segundos en Windows.
  - **Invocación local de Prisma:** prioriza el ejecutable directo `node_modules\.bin\prisma.cmd` antes de recurrir a `npx prisma`, eliminando latencias de red y descargas remotas de npx.
  - **Validación de compilación (`npm run build`):** se constató que no corre linters (`tsc --noEmit`) ni pruebas en producción; genera los artefactos esenciales `dist\index.html` (Vite) y `dist-server\index.mjs` (servidor Hono bundleado con esbuild).
  - **Resiliencia en PM2:** reinicia `omni-pos` preservando variables de entorno (`--update-env`), con fallback a `startOrRestart` con `ecosystem.config.cjs` y volcado de logs (`pm2 logs --nostream`) con `pause` si ocurre cualquier fallo.

- **Integridad del sistema:**
  - Cumplimiento estricto: cero modificaciones en la plantilla de tiques (`print-iframe.ts`), impresión, ventas, caja, stock de inventario ni Kardex.

### Actualización 2026-10-19: Resiliencia ante Ausencia de Git, Diagnóstico P1000 en MySQL y Verificador de Conexión

- **Paso Git Opcional y Seguro en `deploy.bat`:**
  - **Problema en producción:** `deploy.bat` se detenía en el primer paso con `[ERROR] Git no esta instalado o no esta disponible en PATH`, impidiendo desplegar en servidores Windows donde la aplicación se copia manualmente (vía RDP o archivo ZIP) y Git no está instalado.
  - **Solución implementada:** `deploy.bat` ahora comprueba la presencia de `git` y la validez del repositorio de forma condicional y no bloqueante. Si Git está disponible y es un repositorio Git válido, ejecuta `call git pull origin main`; si no está disponible o la carpeta es una copia manual, emite un aviso descriptivo (`[ADVERTENCIA] Git no esta disponible en el PATH. Omitiendo git pull y usando archivos locales`) y continúa el flujo de despliegue sin abortar.

- **Diagnóstico y Tolerancia del Error P1000 en MySQL (`update.bat` y `deploy.bat`):**
  - **Problema en producción:** `prisma db push` fallaba con `P1000: Authentication failed against database server at localhost, the provided database credentials for root are not valid.`. Como consecuencia, la base de datos de producción no sincronizó los cambios de esquema recientes (como la columna `unitsPerBulk` en `Product`), provocando que la aplicación en PM2 fallara al iniciar por columnas faltantes en MySQL.
  - **Generación garantizada de `@prisma/client`:** tanto `update.bat` como `deploy.bat` ahora ejecutan `prisma generate` de forma incondicional **antes** de cualquier intento de migración o `db push`, garantizando que `@prisma/client` siempre quede generado y actualizado en `node_modules`.
  - **Recuadro de diagnóstico interactivo:** ante un fallo de conexión o error P1000 en `db push`, ambos scripts despliegan instrucciones claras indicando al operador:
    1. Revisar la variable `DATABASE_URL` en el archivo `.env`: `mysql://root:CONTRASEÑA_CORRECTA@localhost:3306/farmacia`.
    2. Reglas de codificación de caracteres especiales (por ejemplo `+` se codifica como `%2B`, `@` como `%40`, `#` como `%23`).
    3. Ejecutar `verify-db.bat` para validar de inmediato la conexión sin tener que reiniciar todo el proceso de compilación.

- **Nueva Herramienta de Diagnóstico MySQL (`verify-db.bat` / `scripts/verify-db-connection.mjs`):**
  - Creados `verify-db.bat` y `scripts/verify-db-connection.mjs` (también disponible como `npm run db:check`).
  - Prueba la conexión a MySQL con Prisma en 1 segundo, verifica que la base de datos `farmacia` exista, audita si la columna `unitsPerBulk` ya está presente en la tabla `product`, y ofrece diagnósticos específicos ante errores P1000 (credenciales), P1001 (servicio caído/puerto cerrado) y P1003 (base de datos inexistente).

- **Integridad del sistema:**
  - Cumplimiento estricto: cero modificaciones en la plantilla de tiques (`print-iframe.ts`), impresión, ventas, caja, stock de inventario ni Kardex.

### Actualización 2026-10-09: Autorización de crédito en POS

- En `src/components/pos/payment-grid.tsx`, el botón **Crédito** solo queda habilitado para un cliente real seleccionado cuya ficha tenga `hasCredit: true`; la pantalla de pago muestra si hace falta seleccionar un cliente o si el cliente no tiene autorización.
- `src/components/pos/assign-client-dialog.tsx` permite a administración configurar crédito y devuelve `hasCredit` en la selección. Caja puede crear clientes, pero no muestra el control de crédito; `createOrUpdateCustomer` (`src/lib/actions/customers.ts`) descarta cualquier intento de un rol no administrativo de habilitarlo o modificar sus términos.
- `searchOrCreateCustomer` crea fichas con crédito deshabilitado por defecto. `createSale` continúa validando la autorización en backend antes de registrar una venta a crédito.

### Actualización 2026-10-27: Ganancia por presentación / ítem

- Se agregó la pestaña aislada **Por Presentación / Ítem** en `src/components/reports/reports-hub.tsx`, con el selector global de fechas que ya usa Analítica y exportación CSV/XLSX/PDF propia de la pestaña. Los demás reportes y sus consultas no cambian.
- La acción `reports.getReportProfitByPresentation(from, to)` en `src/lib/actions/reports.ts` consulta facturas completadas del período y agrupa por producto, nombre de presentación y factor. Expone cantidad vendida por presentación, ingresos, costo calculado, ganancia y margen. Usa `presentationFactor` de la línea de factura para convertir a unidades base y `Product.costPriceNIO` para calcular costo.
- UI del detalle en `src/components/reports/report-profit-by-presentation.tsx`; wrapper API generado en `src/lib/actions-client/reports.ts`. El costo refleja el costo de catálogo actual por unidad base, porque `SalesInvoiceItem` no guarda un snapshot del costo al momento de vender.

### Actualización 2026-10-06: Cobros, Layout y Devoluciones

- **Cobros/Cuentas por Cobrar:** `/collections` valida la respuesta del servidor como arreglo y la vista tolera métodos/referencias/clientes ausentes. Fallos de carga producen una lista vacía en vez de tumbar el render.
- **Layout responsive:** `src/components/layout/app-layout.tsx` mantiene una raíz de alto de pantalla, en columna móvil y fila desde `md`, con `min-h-0/min-w-0` para contener scroll y `flex-1` estable. `app-sidebar.tsx` fija el ancho de escritorio y evita shrink.
- **Devoluciones y garantías:** nueva ruta `/devoluciones`, visible a administración y caja. La interfaz reutiliza `src/components/pos/credit-note-dialog.tsx`; exige motivo, permite cantidades parciales y resuelve como reembolso de caja o saldo a favor.
- **Registro e impresión de devoluciones:** `CreditNoteDialog` captura excepciones de búsqueda/registro, conserva los errores del servidor visibles y al confirmar una nota guardada imprime el comprobante de devolución mediante `printReceiptHtml` y el generador independiente `src/lib/print-return-note.ts`. Si se elige vale sin caja activa, la nota se vincula a la sesión de la factura original para cumplir la relación requerida.
- **Historial persistente de devoluciones**: `/devoluciones` consulta el action `credit-notes.getCreditNotes` y presenta las notas guardadas con factura, fecha, cliente, cajero, artículos, importe y motivo; al guardar una devolución vuelve a consultar la base y refleja el nuevo registro. API: `POST /api/actions/credit-notes/getCreditNotes`.
- **Publicación del historial en Hono**: `getCreditNotes` está exportada por `src/lib/actions/credit-notes.ts`, importada por `server/action-modules.ts` y expuesta tanto por el dispatcher genérico como por la ruta explícita `POST /api/actions/credit-notes/getCreditNotes` en `server/dispatcher.ts`. La ruta conserva el contexto de sesión y devuelve `{ success, data }`. Después de regenerar `dist-server/index.mjs`, reiniciar Hono para cargar la versión actualizada. Validación del bundle recién compilado: HTTP 200; sin sesión retorna `No autorizado` y `data: []`.
- **Modelo:** `CreditNote` admite múltiples notas por factura (índice no único en `invoiceId`). `ReturnItem` (`returnitem`) registra `returnId`, `invoiceItemId`, producto, cantidad, precio unitario, total y destino `RESTOCK`/`DAMAGED`. Migración `prisma/migrations/20261006090000_professional_returns`.
- **Aplicación de esquema:** la migración de devoluciones se aplica a la base `DATABASE_URL` con `npx prisma migrate deploy` antes de procesar devoluciones; si el entorno usa sincronización directa, `npx prisma db push` crea `returnitem` y alinea el índice.
- **Inventario y caja:** únicamente renglones marcados para reposición regresan al inventario y generan movimiento Kardex `ENTRADA_DEVOLUCION`; los dañados se auditan como `DAMAGED`. El reembolso crea egreso de caja y actualiza `totalReturns`; saldo a favor queda documentado en la nota sin salida de efectivo.
- **Compatibilidad:** la impresión de tiquetes, búsquedas del POS y lógica de facturación/stock de venta no forman parte de este cambio.
- **Historial de tickets:** vista administrativa `/ticket-history` filtrada exclusivamente por fecha inicio/fin. La ruta explícita `POST /api/actions/reports/getTicketHistory` en `server/dispatcher.ts` conserva el contrato `{ args: [startDate, endDate] }` (también acepta `{ startDate, endDate }`) y llama `src/lib/actions/reports.ts:getTicketHistory` con contexto de sesión. La acción normaliza fechas a límites UTC, consulta el modelo `SalesInvoice` (que no contiene `customerName`; el nombre se obtiene de la relación opcional `customer.fullName`), tolera relaciones nulas y devuelve siempre una lista `data` (vacía si hay error), registrando las excepciones en el servidor. Al reimprimir solicita detalles de la factura y reutiliza `buildReceiptDataFromInvoice` (`src/lib/ticket-data.ts`), los impresores actuales y la marca `isReprint`.
- **Diálogo de reimpresión A4:** en el historial de tickets, la vista previa se desmonta antes de invocar la impresión de Hoja Carta/A4, evitando mantener el focus trap de Radix durante el diálogo nativo bloqueante del navegador. La impresión térmica y sus métodos no cambian.

---

## 3. Arquitectura del Frontend SPA (Vite + TanStack)

El proyecto migró de un fullstack Next.js a una **SPA con API desacoplada**. La lógica de dominio (antes Server Actions de Next) se reutiliza tal cual en el servidor mediante shims de compatibilidad.

### 3.1. Registro de Páginas (`pages-registry.tsx`)
- Generado automáticamente por `scripts/generate-pages-registry.mjs` a partir de la estructura `src/app`.
- Cada ruta se envuelve en un *adapter* que carga sus datos iniciales vía `react-query` y `callAction` (transporte HTTP a la API).
- El adaptador desempaqueta el sobre `{ success, data }` de las acciones, muestra un fallback de carga mientras las queries resuelven y expone los parámetros de ruta dinámicos (`[id]`).

### 3.2. Enrutado (`router.tsx` + `src/lib/route-match.ts`)
- TanStack Router se usa con una única ruta *catch-all* (`$`); la página real se resuelve por coincidencia del `pathname`.
- `route-match.ts` implementa el matcheo exacto + dinámico (patrones `[param]` → `/orders/123`) y guarda los parámetros en un store accesible por los adaptadores (`useRouteParams`).
- El `rootRoute` actúa como layout principal con `<Outlet/>` de TanStack Router: los providers globales (Query, Auth, Settings, BusinessMode, CashRegister, PendingSales) permanecen montados y no se desmontan al navegar entre páginas.
- **Control de Acceso por Rutas (RBAC)**: `src/lib/rbac.ts` define `canAccessRoute(role, pathname)`. El `PageRenderer` valida cada ruta y, si el rol no tiene acceso, reorienta al home del rol (`/pos` para despachador, `/dashboard` para el resto) mediante el componente `RedirectTo`.

### 3.3. Transporte de Acciones (`src/lib/actions-client/*` + `src/lib/api-client.ts`)
- `api-client.ts` expone `callAction(module, fn, args)` que hace `POST /api/actions/:module/:fn` con `{ args }`, soportando `FormData` para subidas de archivos y `credentials: 'include'`.
- `src/lib/actions-client/*` son wrappers generados que replican las firmas de los módulos de acción.
- En Vite, los imports `@/lib/actions/*` en código de cliente se redirigen a `@/lib/actions-client/*` (alias en `vite.config.ts`).

### 3.4. Servidor API (`server/`)
- `server/index.ts`: crea la app Hono, configura CORS, aplica el dispatcher y (en producción) sirve `dist/` con fallback SPA.
- `server/dispatcher.ts`: punto único de ejecución — `POST /api/actions/:module/:fn` lee `{ args }`, resuelve el módulo y la función desde `server/action-modules.ts` (generado) y ejecuta dentro de un contexto de request.
- `server/lib/request-context.ts`: contexto por petición vía `AsyncLocalStorage` (cookies de sesión y caché), replicando `next/headers`.
- `server/shims/*`: compatibilidad de `next/headers`, `next/cache`, `server-only` y `react` cache para que los action modules originales corran sin cambios.
  - ⚠️ El shim `cache` de `react` es **por-request** (usa el `cacheStore` del `RequestContext`), garantizando que `verifySession()` decodifique el JWT de la cookie real de cada petición y no uno cacheado globalmente.

### 3.5. Compatibilidad de Navegación en Cliente (`src/lib/router-nav.tsx`)
- Los imports heredados de `next/navigation` y `next/link` se resolvieron en módulos respaldados por TanStack Router:
  - `useRouter`, `usePathname`, `useSearchParams`, `useParams`, `redirect`, `notFound` y el componente `Link` (acepta `to` u `href`).
  - Los shims de `next/*` fueron eliminados; la navegación es 100% SPA (sin recargas completas).

---

## 4. Arquitectura Multi-Negocio (`businessMode` + `BusinessGuard`)

El sistema cuenta con un motor contextual alimentado por el campo `businessMode` de `SystemSettings`, regulado por la clase guardiana `BusinessGuard` (`src/lib/business-guard.ts`).

```typescript
type BusinessMode =
  | 'JEWELRY'       // Módulos completos de tasación de oro, producción, empeños y reparaciones
  | 'PHARMACY'      // Control de lotes, fechas de caducidad (FEFO) y catálogo médico
  | 'BOUTIQUE'      // Variaciones de Talla/Color, matriz de productos y ropa
  | 'DISTRIBUIDORA' // Rutas de entrega, pedidos de clientes y cobros en campo
```

### Comportamiento del `BusinessGuard`:
- **Modo Joyería (`JEWELRY`)**: Habilita en la barra lateral e interfaces los accesos a `Compra de Oro`, `Producción`, `Inventario de Oro`, `Ventas Joyería`, `Cierre Diario` y `Sincronización CSV`.
- **Modo Farmacia (`PHARMACY`)**: Activa en el formulario de productos los campos de Lote, Registro Sanitario y Caducidad, ajustando el desfalco de inventario según vencimiento más cercano.
- **Modo Boutique (`BOUTIQUE`)**: Despliega la matriz de variaciones por talla y color en la creación de productos y en la terminal POS.
- **Modo Distribuidora (`DISTRIBUIDORA`)**: Desbloquea la gestión de Pedidos, Rutas de Entrega, asignación a Ruteros y Cobranza en campo. Soporta **granos básicos y productos fraccionables** con venta por unidad/libra o empaque (paca/saco/quintal) y precios por niveles (Detalle/Mayorista/Paca/Quintal).

---

## 5. Desglose Detallado de Módulos del Sistema

### 5.1. Módulo Especializado de Joyería (`src/lib/services/`)

#### A. Motor de Precios de Oro de Mostrador (`GoldPricingEngine`)
Implementa la **fórmula exacta de mostrador** para la compra y valoración de oro:

$$ \text{Precio Puro USD} = \frac{\text{MarketPricePerOunce}}{31.10} $$

$$ \text{Precio Puro C\$} = \text{Round}\left(\text{Precio Puro USD} \times \text{ExchangeRate}, 2\right) $$

$$ \text{Fine Gold Grams} = \text{GrossWeightGrams} \times \left(\frac{\text{PurityPercent}}{100}\right) $$

$$ \text{Valor Mercado Pieza} = \text{Fine Gold Grams} \times \text{Precio Puro C\$} $$

$$ \text{Total a Pagar (C\$)} = \text{Round}\left(\text{Valor Mercado Pieza} \times \left(\frac{\text{MarginPercent}}{100}\right), 2\right) $$

$$ \text{Total USD} = \text{Round}\left(\frac{\text{Total a Pagar (C\$)}}{\text{ExchangeRate}}, 2\right) $$

*Nota: La constante de la Onza Troy se mantiene fija en 31.10 gramos.*

#### B. Compra de Oro a Clientes (`GoldPurchase`)
- Registro de transacciones de compra de oro bruto o joyas usadas a clientes.
- Cálculo automático de gramos de oro puro, equivalencia en quilates y precio a pagar.
- Emisión de comprobantes de compra con número de compra autoincrementable.

#### C. Bóveda Virtual & Movimientos de Oro (`GoldStock`, `GoldMovement`)
- Control de inventario de oro acumulado clasificado por quilataje ($10K, 14K, 18K, 24K$).
- Historial de movimientos (`PURCHASE`, `MELT`, `TRANSFORMATION`, `SALE`, `ADJUSTMENT`).
- Registro de procesos de **Fundición (Melt)** para transformar pedacería en materia prima para taller.

#### D. Catálogo de Piezas & Producción (`JewelryPiece`, `GoldTransformation`)
- Fabricación de joyas terminadas utilizando oro de la bóveda.
- Incorporación de costos de mano de obra (`laborCost`), margen de ganancia pretendido e identificación de ubicación física en exhibición (`location`).
- Generación de código único/SKU por pieza.

#### E. Sistema de Apartados / Empeños (`Layaway`)
- Reserva de piezas de joyería con pago de prima inicial (`downPayment`).
- Cálculo automático del saldo pendiente (`remainingAmount`) y fecha de vencimiento (`dueDate`).
- Transición de estados: `ACTIVE` $\rightarrow$ `COMPLETED` (entrega de la pieza) o `EXPIRED` / `CANCELED` (reingreso al inventario).

#### F. Taller de Reparaciones (`RepairOrder`)
- Recepción de piezas de clientes para mantenimiento o reparación.
- Registro de peso recibido (`receivedWeight`), abono inicial (`advancePayment`), fecha estimada de entrega y precio final.
- Trazabilidad de estados: `RECEIVED` $\rightarrow$ `IN_PROGRESS` $\rightarrow$ `COMPLETED` $\rightarrow$ `DELIVERED`.

#### G. Cierre Diario de Joyería (`daily-closing`)
- Módulo de auditoría al final de la jornada para cuadrar los gramos de oro físico en bóveda, ventas de piezas, compras de oro y efectivo en caja.

---

### 5.2. Punto de Venta (POS) & Control de Caja (`src/app/(app)/pos`)

#### A. Sesión de Caja (`CashRegisterSession`)
- **Apertura de Caja**: Registro de monto inicial en C\$ y USD por cajero.
- **Control Operativo**: Registro automático de ventas clasificadas por método de pago (Efectivo NIO, Efectivo USD, Tarjeta, Crédito, Abonos, Servicios).
- **Egresos/Retiros (`CashOutflow`)**: Salidas de dinero justificadas asociadas a la sesión activa.
- **Devoluciones & Notas de Crédito (`CreditNote`)**: Cancelación parcial o total de facturas con generación de nota de crédito.
- **Arqueo Ciego & Cierre**: El cajero ingresa el conteo de dinero físico (`actualCash`, `actualUSD`), el sistema calcula la diferencia y genera el reporte consolidado.

#### B. Terminal POS Interactivo
- Búsqueda en tiempo real por escáner de código de barras o teclado.
- Selección de variaciones (talla/color) o especificación de precio manual en servicios.
- Cobro multimoneda instantáneo con cálculo dinámico de cambio en C\$ o USD.
- **Cantidades decimales**: para productos fraccionables (granos básicos) el carrito acepta 0.5 / 1.5 / 2.5 unidades.
- **Presentación de venta**: los ítems con `hasBoxOption`/`isFractional` ofrecen elegir **Unidad/Libra** vs **Empaque (Caja/Paca/Quintal)**; el subtotal de línea usa el precio del nivel o `boxPrice`, y el stock se descuenta por la conversión (1 paca × 25 = 25 unidades base).

#### C. Flujo Despachador → Cajero (`DispatcherPOS` + `CashierPOS`)
- Cuando `workflow === 'dispatcher-cashier'`, el rol **DISPATCHER** ve de forma exclusiva la vista mobile-first `DispatcherPOS` (`src/components/pos/dispatcher-pos.tsx`):
  - **3 bloques**: selector de cliente, catálogo/escáner de productos y carrito táctil (bottom sheet con +/−/eliminar).
  - **Barra inferior fija**: total de ítems y botón principal de **COBRAR**:
    - Carrito vacío → **"SELECCIONAR PRODUCTOS"** (deshabilitado, `opacity-50 cursor-not-allowed`).
    - Con productos → **"COBRAR ( C\$ total )"** en blanco/grueso; abre el `PaymentSummaryDialog` (Total, Pagado, Cambio) y al confirmar **CONTINUAR** persiste la comanda.
  - **Cliente opcional**: si no se selecciona cliente, se asigna automáticamente **"CLIENTE GENERAL"**.
  - Al confirmar, persiste una **comanda** en `HeldSale` (vía `createHeldSale`) con metadatos: nombre del cliente (o CLIENTE GENERAL), `dispatcherName` (vendedor), `total` y `createdAt` (hora/fecha); muestra toast de éxito y limpia el carrito.
  - Sin elementos de cobro/arqueo directo: el despachador solo toma la comanda.
- El rol **CASHIER** recibe esas comandas desde `CashierPOS`, que presenta la lista de pendientes como tarjetas identificables al instante:
  - `[Comanda #NNN | Despachador: Juan | C$ 109.25 | 03:29 PM - 23/08/2026] - Cliente: General / Maria Lopez`.
  - Al seleccionar, carga los ítems, cobra y descuenta inventario/Kardex con la conversión de empaques correspondiente.
- **Robustez del POS**: los errores de comunicación de extensiones del navegador (`Unchecked runtime.lastError: Could not establish connection`) se silencian globalmente en `main.tsx` sin afectar errores reales; el modal de cliente usa `max-h-[85vh]` con scroll y footer visible.

---

### 5.3. Inventario General & Variaciones (`src/app/(app)/inventory`)

- **Productos & Categorías**: Árbol jerárquico de categorías, gestión de marcas, género, unidades de medida y stock mínimo de alerta.
- **Selector de categorías buscable**: el modal "Añadir Nuevo Artículo" usa un `CategoryCombobox` (Popover + input con filtro en tiempo real) que deduplica las categorías por nombre.
- **Precios por Niveles (Escalas)**: cada producto soporta hasta 4 niveles de precio: `Precio Detalle` (`priceNIO`), `Precio Por Mayor / Media Paca` (`price2`), `Precio Paca / Bulto` (`price3`) y `Precio Quintal / Volumen Especial` (`price4`).
- **Venta Multi-Empaque & Fraccionada**: campos `hasBoxOption`, `unitsPerBox`, `boxPrice`, `isFractional`, `bulkUnit` (paca/saco/quintal) y `baseUnit` (libra/unidad). El inventario se registra y descuenta siempre en la **unidad mínima base**.
- **Matriz de Variantes (`ProductVariant`)**: Combinaciones únicas de Talla (`Size`) y Color (`Color`) con precio, costo y código de barras propio.
- **Lotes & Vencimientos (`InventoryItem`)**: Trazabilidad de fechas de vencimiento y lotes de proveedores.
- **Kardex de Inventario (`InventoryMovement`)**: Auditoría inmutable de todas las entradas, salidas, ajustes de inventario y ventas con marca de agua de usuario.
- **Historial de Importaciones (`ImportHistory`)**: Registro de sincronizaciones CSV/Excel con detalle de filas exitosas/fallidas.

#### Importación Excel (plantilla y parser)
- La plantilla `plantilla_inventario.xlsx` (Modo Distribuidora/General) usa este orden de columnas:
  `Nombre del Producto | Código de Barras | Categoría | Precio_Nivel_1 | Precio_Nivel_2 | Precio_Nivel_3 | Precio_Nivel_4 | Unidad_Base | Presentacion_Empaque | Cantidad_Por_Empaque | Es_Fraccionable | Precio de Costo | Stock Mínimo | Unidad de Medida | Tipo de Inventario | Lote | Cantidad | Fecha de Vencimiento`
- **Niveles de precio**: `Precio_Nivel_1` (Base/Detalle → `priceNIO`), `Precio_Nivel_2` (Bulto/Paca/Intermedio → `price2`), `Precio_Nivel_3` (Mayorista/Volumen → `price3`), `Precio_Nivel_4` (Especial/Distribución → `price4`). Se gestionan exclusivamente con el esquema de Niveles de Precio; no hay columnas de precio por empaque.
- **Unidades/conversión**: `Unidad_Base` (libra/litro/unidad — unidad física del Kardex), `Presentacion_Empaque` (quintal/paca/caja/bidón), `Cantidad_Por_Empaque` (factor multiplicador, ej. Quintal=100, Paca=25, Bidón=20, Caja=12), `Es_Fraccionable` (TRUE/FALSE).
- Columnas clásicas: Lote, Cantidad, Fecha de Vencimiento, etc.
- Filas de ejemplo incluyen granos básicos (Arroz Paca 25lbs, Frijol Quintal 100lbs), líquidos (Aceite Bidón 20L) y artículos sin empaque (Anillos/Aretes).
- El parser (`validateRow` en `import-inventory-dialog.tsx`) acepta las columnas nuevas (con compatibilidad hacia atrás), y `bulkImportInventory` persiste los niveles de precio y los campos de empaque/conversión en `Product`.
- **Venta fraccionada**: si `Es_Fraccionable` es TRUE, el POS permite cantidades decimales (0.5 quintal, 0.5 bidón, 2.5 lb); el stock maestro siempre se descuenta en `Unidad_Base` (`cantidad × Cantidad_Por_Empaque`, ej. 0.5 bidón × 20 = 10 litros) y el precio se calcula con el Nivel de Precio seleccionado × cantidad (o fracción × factor de empaque).

#### Módulo Opcional de Recetas / BOM (`enableRecipes`)
- Activado desde **Configuración → Recetas** (`SystemSettings.enableRecipes`). Con el módulo **apagado**, todos los productos se comportan como `STANDARD` (Reventa) y el POS funciona igual que siempre; el selector de tipo no se muestra.
- `Product.type` (`ProductType`): `STANDARD` (Reventa), `INGREDIENT` (Materia Prima) y `RECIPE_ITEM` (Platillo Preparado).
- **`RecipeItem`** (tabla `recipeitem`): relación platillo→insumo (`productId → ingredientId`, `quantity`, `unit`), con FK de eliminación en cascada por platillo y restricción en el insumo.
- **Costeo en el formulario de producto** (crear y editar): buscador de insumos, costo total del platillo, porcentaje de ganancia deseado y botón **"Aplicar Precio Sugerido"** (`precio = costo / (1 − margen%)`).
- **Descuento automático en la venta**: al vender un `RECIPE_ITEM`, `createSale` descuenta la materia prima por FIFO/vencimiento (Kardex `Salida`, saldos negativos como ENCARGO) multiplicando `cantidad vendida × quantity de cada línea`; si la receta está vacía, cae al flujo estándar. La lógica de productos `STANDARD` **no se toca**.
- El catálogo del POS incluye los `RECIPE_ITEM` aunque no tengan lote propio (condición **aditiva**, solo con el módulo activo).

---

### 5.4. Compras a Proveedores (Encabezado + Detalle) (`src/app/(app)/purchases`)

- **Encabezado (`PurchaseInvoice`)**: `supplierId`, `invoiceNumber`, `paymentType` (`CASH`/`CREDIT`), `issueDate`, `dueDate`, `subtotal`, `tax`, `discount`, `totalAmount`, `paidAmount`, `status` y `details`.
- **Detalle (`PurchaseInvoiceItem`)**: por línea, `purchaseInvoiceId`, `productId`, `presentation` (`UNIT`/`BOX`/`QUINTAL`), `quantity`, `unitCost`, `subtotal` y `unitsConverted` (las unidades físicas base ya convertidas, p. ej. 20 quintales × 100 = 2000 libras).
- **Transacción atómica** (`createPurchaseInvoiceWithItems` dentro de `db.$transaction`):
  1. Crea el maestro `PurchaseInvoice`.
  2. Inserta los ítems en `PurchaseInvoiceItem`.
  3. Incrementa el stock real (`InventoryItem` / `ProductVariant.stock`) aplicando la conversión Caja/Quintal → Libras/Unidades.
  4. Genera el movimiento de entrada en el Kardex (`InventoryMovement`).
  5. Si `paymentType === 'CREDIT'`, registra la cuenta por pagar al proveedor en `AccountsPayable` (`amount`, `paidAmount`, `status`, `dueDate`).
- El costo unitario de la presentación mayor se divide (`cost / unitsPerBox`) para reflejar el costo por unidad base en el Kardex.

---

### 5.5. Clientes, Crédito & Logística de Rutas (`src/app/(app)/delivery-routes`)

- **Gestión de Clientes (`Customer`)**: Registro de datos de contacto, documento de identidad, asignación de crédito habilitado (`hasCredit`), límite de crédito y saldo pendiente.
- **Ventas a Crédito (CxC)**: `SalesInvoice` con saldo a crédito; en caja, la venta a cliente con crédito requiere **autorización de administrador** (`requiresAdmin` en las acciones de caja/abonos); el saldo se refleja en la ficha del cliente y en el **Reporte de Antigüedad de Cuentas por Cobrar** (saldos por rangos de días, consolidado en la tarjeta "Abonos" del reporte de ventas).
- **Abonos a Crédito (`CreditPayment`)**: Registro de pagos a cuentas por cobrar con comprobante de recibo impreso.
- **Logística de Rutas de Entrega (`DeliveryRoute`, `DeliveryRouteStop`)**:
  - Creación de rutas de distribución asignadas a un rutero/cobrador (`User`).
  - Generación de paradas por pedido de cliente (`CustomerOrder`).
  - Control de entregas y cobranza en campo (`CollectionPayment`).

---

### 5.6. Seguridad, Licenciamiento & Auditoría (`src/app/(app)/users`, `src/actions/activation.ts`)

- **Control de Acceso por Roles (RBAC)**:
  - `ADMIN`: Acceso total a configuraciones, reportes, usuarios y ajustes.
  - `CASHIER` (Cajero): Acceso a POS, apertura/cierre de caja y clientes.
  - `DISPATCHER` (Despachador): Acceso exclusivo a su vista de toma de pedidos `/pos` (mobile-first). Al iniciar sesión se le redirige a `/pos`; si intenta navegar a `/users`, `/settings`, `/reports`, `/kardex`, `/cash-count`, `/customers/credit`, etc., el router lo reorienta a `/pos` (`canAccessRoute`). En el menú lateral solo ve los ítems permitidos.
  - `RUTERO`: Acceso a rutas de entrega y cobro en campo.
- **Sesiones aisladas**: `verifySession()` decodifica el JWT de la cookie real de cada petición (caché por-request vía AsyncLocalStorage), y la cookie `session` se emite `HttpOnly` (Secure solo en producción), se sobrescribe en login y se limpia en logout.
- **Registro de Auditoría (`AuditLog`)**: Captura inmutable de acciones críticas (IP, usuario, tipo de entidad, ID, descripción y metadatos JSON).
- **Sistema de Licenciamiento (`SystemSettings`)**: Validación de activación mediante claves, control de fecha de vencimiento de licencia y estado de activación del sistema (`isActivated`, `isPremium`).
- **Configuración Operativa (`SystemSettings`)**: `enableRecipes` (activa/desactiva el módulo de recetas BOM) y ajustes paramétricos de crédito/abonos desde `/settings`.
- **Activación automática**: si se detectan datos previos (usuarios, piezas o productos) sin `SystemSettings` activado, el sistema se auto-activa para evitar bloqueos.

---

## 6. Modelo de Datos (Diagrama ER Principal)

```mermaid
erDiagram
    User ||--o{ CashRegisterSession : "abre/cierra"
    User ||--o{ AuditLog : "genera"
    User ||--o{ DeliveryRoute : "conduce"
    
    Customer ||--o{ SalesInvoice : "compra"
    Customer ||--o{ GoldPurchase : "vende oro"
    Customer ||--o{ Layaway : "reserva"
    Customer ||--o{ RepairOrder : "solicita"
    Customer ||--o{ CustomerOrder : "solicita pedido"
    Customer ||--o{ CreditPayment : "abona a crédito"

    CashRegisterSession ||--o{ SalesInvoice : "registra"
    CashRegisterSession ||--o{ CashOutflow : "egresa"
    CashRegisterSession ||--o{ CreditNote : "emite"
    SalesInvoice ||--o{ CreditPayment : "recibe abonos"
    
    Product ||--o{ ProductVariant : "tiene"
    Product ||--o{ InventoryItem : "posee lotes"
    Product ||--o{ RecipeItem : "platillo con insumos"
    RecipeItem }o--|| Product : "usa materia prima INGREDIENT"
    Category ||--o{ Product : "clasifica"
    
    Size ||--o{ ProductVariant : "pertenece"
    Color ||--o{ ProductVariant : "pertenece"
    
    SalesInvoice ||--o{ SalesInvoiceItem : "contiene"
    SalesInvoiceItem }o--|| ProductVariant : "refiere"
    
    JewelryMaterial ||--o{ JewelryPiece : "materia prima"
    JewelryPiece ||--o{ Layaway : "asociada"
    JewelryPiece ||--o{ GoldTransformation : "resultado de"
    GoldStock ||--o{ GoldMovement : "registra"
    
    CustomerOrder ||--o{ DeliveryRouteStop : "origen de"
    DeliveryRoute ||--o{ DeliveryRouteStop : "compuesta por"

    Supplier ||--o{ PurchaseInvoice : "emite"
    PurchaseInvoice ||--o{ PurchaseInvoiceItem : "contiene"
    PurchaseInvoice ||--o{ AccountsPayable : "genera (CREDIT)"
    PurchaseInvoiceItem }o--|| Product : "refiere"

    User ||--o{ HeldSale : "despacha"
    HeldSale }o--|| Customer : "comanda para"
```

---

## 7. Guía de Estilos & Principios de UX/UI

### Paleta de Colores Corporativa
- **Color Primario (Joyería Gold)**: `#D4AF37` / `#B8860B` (Acentos dorados elegantes para estados de valor y botones de acción principal).
- **Fondo / Tema Oscuro (Dark Slate)**: `#0F172A` / `#1E293B` (Diseño limpio, profesional y de baja fatiga visual).
- **Acento Verde Éxito**: `#10B981` (Ventas completadas, caja cuadrada, saldo a favor).
- **Acento Rojo Alerta**: `#EF4444` (Egresos, diferencias en arqueo, piezas vencidas).

### Principios de Interfaz:
1. **Glassmorphism & Bordes Sutiles**: Uso de contenedores semitransparentes con desfoque de fondo (`backdrop-blur-md`) y bordes suaves (`border-white/10`).
2. **Diseño Adaptativo Táctil**: Botones con área táctil optimizada para monitores de punto de venta (pantallas táctiles) y tabletas.
3. **Indicadores de Carga & Skeletons**: Interfaz fluida que presenta marcadores de posición (`Skeletons`) o spinners en lugar de pantallas en blanco durante la carga de datos.
4. **Respuesta Visual en Tiempo Real**: Animaciones micro en botones, actualización instantánea de totales en el POS y notificaciones toast ante eventos clave.

---

## 8. Roadmap Tecnológico (2026+)

### Q3 2026
- [x] Motor completo de tasación de oro y compras a clientes.
- [x] Control de apartados, empeños y reparaciones de joyería.
- [x] Matriz de variaciones por Talla y Color (Boutique).
- [x] Módulo de rutas de entrega y cobranza en campo.
- [x] **Migración a SPA (Vite) + API desacoplada (Hono)**: los módulos de dominio de Next Server Actions se reutilizan vía dispatcher y shims; frontend con TanStack Router/Query.
- [x] **Registro de páginas y enrutado SPA**: generador de `pages-registry`, adaptadores con carga de datos, matcheo de rutas dinámicas (`[id]`) y páginas de joyería adaptadas al cliente.
- [x] **Vista mobile-first del Despachador**: flujo `dispatcher-cashier` con `DispatcherPOS` (toma de comandas) + `CashierPOS` (cobro), persistencia en `HeldSale`.
- [x] **Botón COBRAR con resumen de pago**: estado vacío ("SELECCIONAR PRODUCTOS", deshabilitado) vs activo ("COBRAR (C\$ total)") que abre `PaymentSummaryDialog`; cliente opcional con "CLIENTE GENERAL" por defecto; lista de pendientes en caja con `Comanda # / Despachador / Total / Hora / Cliente`.
- [x] **Robustez UI del POS**: silenciado global de errores de extensión del navegador (`runtime.lastError`), y modal de cliente con `max-h-[85vh]` + scroll + footer visible.
- [x] **RBAC por rutas**: `canAccessRoute` reorienta al home del rol; dispatcher restringido a `/pos`.
- [x] **Venta Multi-Empaque y Fraccionada**: niveles de precio (Detalle/Mayorista/Paca/Quintal), unidades/conversión (`unitsPerBox`, `baseUnit`, `bulkUnit`, `isFractional`), cantidades decimales en POS y descuento de stock por conversión.
- [x] **Compras Encabezado + Detalle**: `PurchaseInvoice` + `PurchaseInvoiceItem` + `AccountsPayable` en transacción atómica con conversión de empaques y Kardex.
- [x] **Importación Excel avanzada**: plantilla con `Precio_Nivel_1..4`, `Unidad_Base/Presentacion_Empaque/Cantidad_Por_Empaque` y `Es_Fraccionable`; parser con validación, deduplicación de categorías y venta fraccionada (medios quintales/bidones).
- [x] **Crédito & Cuentas por Cobrar (CxC/CxP)**: ventas a crédito con autorización de administrador en caja, abonos con recibo, saldos de clientes y reporte de Antigüedad de Cuentas por Cobrar con tarjeta de abonos en el reporte de ventas.
- [x] **Módulo Opcional de Recetas (BOM)**: tipos de producto `INGREDIENT`/`RECIPE_ITEM`, receta/costeo de insumos con margen y "Aplicar Precio Sugerido", y descuento automático de materia prima (FIFO) al vender platillos en el POS — activable/desactivable desde Configuración.
- [x] **Errores de dominio en español**: mensajes de error coherentes en acciones de inventario, proveedores, cobranzas y recetas.
- [x] **Formato de impresión al cobrar en POS**: después de registrar una venta, el cajero puede elegir entre el ticket térmico existente y la factura de hoja completa existente desde la vista previa compartida (`src/app/(app)/pos/client.tsx`). Se conserva la preferencia de impresión local mediante `src/lib/print-format.ts`; no se alteran las plantillas ni el método de impresión.
- [x] **Fecha y estado del comprobante POS**: `src/app/(app)/pos/client.tsx` normaliza `date` en las props de vista previa/portal y antes de invocar los métodos de impresión; la vista previa solo se monta con un comprobante no nulo, evitando errores al desmontar el selector. No se alteran archivos de plantilla ni impresores.
- [x] **Impresión Carta en POS**: el selector se deja desmontar antes de invocar la impresión nativa bloqueante; el pie de firma dice “Entregado por” sin modificar el diseño de factura (`src/lib/print-a4.ts`, `src/components/pos/invoice-a4-template.tsx`).
- [x] **Cierre manual de notificaciones en POS**: el aviso de venta dura 1 segundo; X y gesto hacia la derecha descartan el toast, y los toques dentro del viewport de toast no cierran el selector de impresión (`src/app/(app)/pos/client.tsx`, `src/components/ui/toast.tsx`, `src/components/ui/toaster.tsx`).

### Q4 2026
- [x] **Lotes y vencimientos en modo Farmacia**: `InventoryItem.batch` y `InventoryItem.expiryDate` son el inventario por lote existente; los formularios manuales de alta/edición muestran lote y vencimiento como campos opcionales cuando `businessMode = PHARMACY` y usan valores neutrales si se dejan vacíos. La plantilla Excel de Farmacia incluye `Lote` y `Expiración`; el lector admite ambos encabezados de vencimiento, fechas Excel/ISO y celdas vacías, normalizándolas sin rechazar la fila. No se cambia la plantilla estándar de los demás modos. El catálogo del POS sigue consultando un producto por registro `Product` (no duplica tarjetas por lote); `createSale` consume los lotes por vencimiento ascendente (FEFO) y escribe un movimiento por lote realmente consumido.
- [x] **Trazabilidad por lote en Kardex**: `InventoryMovement.batchNumber` y `InventoryMovement.expiryDate` conservan el lote/fecha en movimientos de Farmacia; la migración `20261028010000_kardex_lot_traceability` agrega las columnas opcionales para no afectar movimientos históricos ni otros modos. Entradas por compra/orden/importación/alta, ajustes manuales, ventas FEFO, devoluciones de notas de crédito y liquidaciones de rutas escriben el lote correspondiente cuando está disponible. La pestaña Movimientos y el informe/CSV del Kardex muestran lote y vencimiento, y agrupan filas por lote solo en Farmacia. Las cantidades anterior/final del movimiento son por lote en ese modo; los modos no farmacéuticos conservan el agrupamiento y comportamiento previos.
- [x] **Control de Personal y Nómina**: modelos `Employee`, `EmployeeLoan`, `EmployeeAbsence` y `PayrollRecord`; frecuencia semanal/quincenal, ausencias, préstamos pendientes y generación de pago con deducciones. La nómina cuenta días de lunes a sábado y marca los préstamos descontados dentro de la misma transacción.
- [x] **Préstamos vinculados a salida de caja**: el retiro del POS y Cuadre de Caja puede asociarse a un trabajador; el movimiento `CashOutflow` y `EmployeeLoan` se guardan atómicamente y el préstamo conserva `cashMovementId`.
- [x] **Ruta administrativa `/employees`**: filtros por nombre, frecuencia y estado; alta/activación de trabajadores, registro de faltas y préstamos, vista previa y procesamiento de nómina. Acceso restringido a `admin` y `master-admin`.
- [x] **Edición de trabajadores**: la tabla de `/employees` ofrece una acción de edición para nombre, salario diario, frecuencia y estado activo. La acción protegida `employees.updateEmployee` valida los datos y actualiza el modelo `Employee` mediante `POST /api/actions/employees/updateEmployee` (dispatcher genérico Hono). Tras editarla, se reconstruyó `dist-server/index.mjs` y se reinició el servicio local para quitar el 404 del bundle anterior; la UI refresca la tabla y notifica el resultado.
- [x] **Scroll del diálogo de nómina**: el modal de generación limita su altura al viewport, desplaza internamente los campos y el desglose, y conserva la cabecera y los botones de cancelar/procesar visibles. No cambia fórmulas ni cálculos de nómina.
- [x] **Eliminación segura de trabajadores**: la acción `employees.deleteEmployee` verifica historial de préstamos, nómina y faltas en una transacción; si existe, conserva el registro y lo marca inactivo, y solo elimina físicamente trabajadores sin historial. La pantalla exige confirmación mediante el componente reusable `src/components/ui/confirm-delete-dialog.tsx` antes de ejecutar la acción.
- [x] **Abonos voluntarios a préstamos en nómina**: `EmployeeLoan.remainingBalance` mantiene el saldo amortizable (migración `20261006140000_employee_loan_balances`; saldos nulos de préstamos originados en retiros se interpretan como su monto original). La modal refresca `employees.getEmployees` al abrirse y al recalcular para mostrar el mismo saldo real que la tabla. El resumen muestra deuda actual, abono editable, deuda restante y neto reactivo. Backend valida `loanDeduction` contra deuda y salario tras faltas, aplica el abono FIFO dentro de la transacción, conserva `PENDING` si resta saldo y marca `DEDUCTED` al liquidarlo. La nómina guarda el monto aplicado en `PayrollRecord.loanDeductions`.
- [x] **Historiales de personal y colilla térmica**: `EmployeeLoanPayment` registra cada amortización vinculada al préstamo y, para descuentos de nómina, al `PayrollRecord`, con origen `PAYROLL` o `CASH`; migración `20261006160000_employee_loan_payments`. Acciones `employees.getEmployeeLoanHistory` y `employees.getEmployeePayrollHistory` alimentan las modales de historial en `/employees`. El historial de nómina incluye período, días trabajados calculados, faltas, bruto, descuento de préstamos y neto; la colilla imprimible de 80 mm se genera en `src/lib/print-payroll-stub.ts` y reutiliza `printReceiptHtml` de `src/lib/print-iframe.ts` sin alterar el helper ni las plantillas del POS.
- [x] **Rutas HTTP de historiales de personal**: `POST /api/actions/employees/getEmployeeLoanHistory` recibe `{ args: [employeeId] }` o `{ employeeId }` y responde `{ success, data }` con préstamos, saldos, estado y pagos asociados; `POST /api/actions/employees/getEmployeePayrollHistory` acepta ambos contratos y devuelve `{ success, employee, data }` con liquidaciones, días laborables y faltas. Ambas rutas están registradas explícitamente en `server/dispatcher.ts`, ejecutan las acciones exportadas de `src/lib/actions/employees.ts` con contexto de sesión y se mantienen también en el dispatcher genérico. Se reconstruyó `dist-server/index.mjs`; el proceso Hono que ya estaba escuchando en 9003 aún respondió 404 durante la verificación, por lo que debe reiniciarse para cargar este bundle actualizado.
- [x] **Acciones API de personal** (`POST /api/actions/employees/<acción>`): `getEmployees`, `getActiveEmployees`, `getEmployeeLoanHistory`, `getEmployeePayrollHistory`, `createEmployee`, `setEmployeeActive`, `deleteEmployee`, `createEmployeeLoan`, `createEmployeeAbsence`, `registerEmployeeLoanPayment`, `previewEmployeePayroll` y `processEmployeePayroll`. El catálogo activo también permite acceso de `cashier` para asociar préstamos desde el retiro.
- [x] **Purga de Anticipo en Control de Personal**: se eliminó el botón, modal, estado, wrapper y acción backend `employees.registerEmployeeAdvance`; las deducciones de nómina y los abonos manuales usan exclusivamente `EmployeeLoan` y el flujo existente de préstamos/abonos. El esquema ya no contiene `EmployeeLoan.kind` ni `PayrollRecord.advanceDeductions`. La migración `20261027230000_remove_employee_advance_feature` unifica los montos históricos de anticipos dentro de `loanDeductions`, convierte los saldos etiquetados `[ANTICIPO]` en préstamos estándar y después elimina las columnas exclusivas. Se conservan registros y pagos históricos; no se alteran ventas, caja, stock, Kardex ni impresión.
- [x] **Registro y publicación de acciones Hono**: `getActiveEmployees` se expone como `POST /api/actions/employees/getActiveEmployees` mediante `server/action-modules.ts` y el bundle desplegable `dist-server/index.mjs`; reconstruir y reiniciar Hono después de agregar el módulo. El modal de retiro asocia explícitamente su descripción accesible con `DialogContent`.
- [x] **Migración de personal**: `prisma/migrations/20261006120000_employee_management/migration.sql` crea las tablas y relaciones indicadas, sin tocar ventas, plantillas de impresión, inventario ni Kardex.
- [ ] ⚖️ **Integración Hardware**: Lectura directa de balanzas digitales de precisión vía puerto Serial/USB para captura de peso en tiempo real.
- [ ] 🖨️ **Impresión Térmica Nativa**: Driver ESC/POS para impresión directa en comanderas de 80mm y 58mm sin cuadro de diálogo del navegador.
- [ ] 📱 **App Móvil de Ruteros**: Aplicación PWA/React Native offline para cobradores y repartidores.
- [ ] 📊 **Business Intelligence (BI)**: Tableros de predicción de demanda de oro y productos con exportación avanzada a Excel/PDF.
