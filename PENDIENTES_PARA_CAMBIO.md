# Pendientes para Cambio y Migración a Firebase SQL Connect / Cloud SQL (PostgreSQL)

> **Proyecto:** JoyeriaPlus (Next.js + Prisma + App Móvil Flutter)  
> **Objetivo:** Guía de pendientes, requisitos e integración de la app móvil para Ruteros (Flutter) consumiendo PostgreSQL en Firebase.

---

## 📌 1. Requisitos Previos e Infraestructura (Firebase / GCP)

- [ ] **1. Activar el Plan Blaze (Pay-as-you-go) en Firebase:**
  - Cloud SQL PostgreSQL es un servicio gestionado de Google Cloud que requiere el plan de pago por uso de Firebase.
- [ ] **2. Provisionar la Base de Datos PostgreSQL:**
  - Entrar a la consola de Firebase → *SQL Connect / Bases de datos*.
  - Hacer clic en **"Comenzar"** y configurar:
    - **Región:** Seleccionar la región más cercana a tus usuarios (ej. `us-central1`).
    - **Credenciales:** Guardar nombre de base de datos, usuario administrador y contraseña.
- [ ] **3. Obtener Cadena de Conexión y Accesos SSL:**
  - Obtener la URL de conexión PostgreSQL (`DATABASE_URL`) y los permisos de IP / Cloud SQL Proxy para conexiones externas.
- [ ] **4. Instalar Firebase CLI (si se usará el SDK nativo):**
  - Instalar o actualizar la herramienta de terminal: `npm install -g firebase-tools`.

---

## 🛠️ 2. Opciones de Consumo en el Código (JoyeriaPlus Web)

### Opción A: Mantener Prisma ORM (Recomendada - Menor Impacto)
Como la base de datos subyacente es **PostgreSQL estándar**, no es necesario reescribir tus consultas ni componentes.

- [ ] **1. Cambiar el proveedor en `prisma/schema.prisma`:**
  ```prisma
  datasource db {
    provider = "postgresql" // Cambiar "mysql" por "postgresql"
    url      = env("DATABASE_URL")
  }
  ```
- [ ] **2. Actualizar la variable de entorno `.env`:**
  ```env
  DATABASE_URL="postgresql://usuario:password@host_cloud_sql:5432/nombre_bd?sslmode=require"
  ```
- [ ] **3. Sincronizar el esquema con la nueva BD:**
  ```bash
  npx prisma db push
  ```

---

## 📱 3. Arquitectura y Requisitos para App Móvil de Rutero (Flutter)

### A. Requisitos de la App Móvil (Flutter / Android)
- [ ] **1. Autenticación y Perfiles:**
  - Integrar Firebase Auth o JWT de tu API Next.js para login del usuario con rol `RUTERO`.
- [ ] **2. Consumo de API / BD:**
  - **Recomendación:** La app de Flutter debe comunicarse mediante **API REST / GraphQL** (expuesta por tu backend de Next.js) o directamente mediante SDK de Firebase Data Connect. *No conectar Flutter directamente a la cadena nativa de PostgreSQL por seguridad.*
- [ ] **3. Soporte Offline-First (Crucial para repartidores):**
  - Implementar base de datos local en Flutter (**Hive**, **Isar** o **SQLite**) para guardar la ruta del día.
  - Si el rutero se queda sin señal 4G, puede registrar cobros y entregas localmente, y la app sincroniza con Postgres automáticamente cuando vuelve la conexión.
- [ ] **4. Notificaciones Push (Firebase Cloud Messaging - FCM):**
  - Notificar al rutero instantáneamente cuando el administrador le asigna una nueva `DeliveryRoute` o hace cambios de prioridad.
- [ ] **5. Geolocalización y Mapas:**
  - Integrar paquete `geolocator` y `google_maps_flutter` para ordenamiento de paradas (`DeliveryRouteStop`) y navegación GPS (abrir en Waze / Google Maps).
- [ ] **6. Impresión Bluetooth (Opcional pero recomendado):**
  - Soporte para impresoras térmicas Bluetooth portátiles (`blue_thermal_printer`) para emitir recibos físicos de cobro en el momento.

---

### B. Flujo de Trabajo End-to-End (Administrador ➔ Rutero)

1. **Planificación (Panel Admin - Next.js):**
   - El administrador crea una ruta (`DeliveryRoute`), selecciona las órdenes de compra pendientes (`CustomerOrder`) y se las asigna al `ruteroId`.
2. **Recepción (App Rutero - Flutter):**
   - El rutero recibe la notificación Push, abre la app y descarga su lista de paradas del día (`DeliveryRouteStop`).
3. **Atención en Ruta y Cobro:**
   - Al llegar al cliente, el rutero marca la entrega como completada.
   - Si la orden requiere cobro en el sitio, registra el pago (`CollectionPayment`) indicando monto y método de pago (Efectivo / Transferencia / Tarjeta).
4. **Sincronización y Cierre de Caja:**
   - La app envía los datos a PostgreSQL en tiempo real.
   - Al finalizar la jornada, el panel de administración muestra el reporte de liquidación: **Efectivo cobrado vs. Pedidos entregados**.

---

## 🔄 4. Migración de Datos (MySQL ➔ PostgreSQL)

- [ ] **1. Ajuste de Tipos de Datos:**
  - Revisar que campos específicos de MySQL (`LongText`, `autoincrement`, `Enums`) tengan equivalencias exactas en PostgreSQL.
- [ ] **2. Migración de Registros Existentes:**
  - Exportar datos actuales de MySQL e importarlos a PostgreSQL usando `pgloader` o script de Node.js/Prisma.
- [ ] **3. Pruebas de Integración:**
  - Ejecutar pruebas tanto en la Web Next.js como en la App Flutter para asegurar la integridad de datos.
