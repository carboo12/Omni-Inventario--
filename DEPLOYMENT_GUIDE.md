# Guía de Despliegue y Automatización con PM2

Esta guía detalla los pasos para desplegar la aplicación **Farmacia Ultimate** en el servidor del cliente y configurar **PM2** para que la aplicación se ejecute automáticamente y se reinicie ante fallos o reinicios del servidor.

## 1. Prerrequisitos en el Servidor

Antes de copiar la aplicación, asegúrate de que el servidor tenga instalado:

1.  **Node.js (LTS)**: Descargar e instalar la versión LTS desde [nodejs.org](https://nodejs.org/).
2.  **MySQL Server**: Debe estar instalado, corriendo y con la base de datos creada.
3.  **Git** (Opcional): Si planeas descargar el código usando Git.

## 2. Preparación de la Aplicación

En tu máquina de desarrollo (donde ya compilaste):
1.  Asegúrate de haber ejecutado `npm run build` exitosamente.
2.  Copia los siguientes archivos/carpetas al servidor del cliente (por ejemplo, a `C:\FarmaciaApp` o `/var/www/farmacia`):
    *   Carpeta `.next` (Oculta, contiene el build).
    *   Carpeta `public` (Si existe, contiene imágenes y estáticos).
    *   Archivo `package.json`.
    *   Archivo `next.config.ts`.
    *   Archivo `.env` (Configúralo con los datos de producción del cliente).
    *   Carpeta `prisma` (Para ejecutar migraciones si es necesario).

## 3. Instalación en el Servidor

1.  Abre una terminal (PowerShell en Windows o Bash en Linux) en la carpeta donde copiaste los archivos.
2.  Instala las dependencias de producción:
    ```bash
    npm install --production
    ```
3.  Genera el cliente de Prisma:
    ```bash
    npx prisma@5.22.0 generate
    ```

## 4. Instalación y Configuración de PM2

PM2 es el gestor de procesos que mantendrá la aplicación viva.

### Paso 4.1: Instalar PM2 Globalmente
Ejecuta en la terminal:
```bash
npm install -g pm2
```

### Paso 4.2: Configurar y Arrancar PM2

En Windows, pasar argumentos complejos por línea de comandos puede fallar. La forma profesional y segura es crear un archivo de configuración.

1.  **Limpieza previa:** Como tienes procesos fallidos anteriores, primero límpialos:
    ```bash
    pm2 delete all
    ```

2.  En la carpeta de tu aplicación (ej. `C:\farmacia`), edita el archivo `ecosystem.config.cjs` y cambia su contenido por este (es más directo y evita errores de Windows):

    ```javascript
    module.exports = {
      apps : [{
        name   : "farmacia-app",
        script : "node_modules/next/dist/bin/next",
        args   : "start",
        env: {
          NODE_ENV: "production",
          PORT: 3000
        }
      }]
    }
    ```

3.  Inicia la aplicación usando este archivo:
    ```bash
    pm2 start ecosystem.config.cjs
    ```

4.  Verifica que esté corriendo:
    ```bash
    pm2 list
    ```
    Deberías ver "farmacia-app" con estado `online`.

5.  **Acceso a la Aplicación:**
    Una vez iniciada, abre el navegador en el servidor o en la red local y ve a:
    *   **Localmente:** `http://localhost:3000`
    *   **Desde otra PC:** `http://IP_DEL_SERVIDOR:3000`

## 5. Automatización (Startup)

Para que la aplicación se inicie sola si el servidor se reinicia:

### En Windows
1.  Instala la librería de inicio para Windows:
    ```bash
    npm install -g pm2-windows-startup
    ```
2.  Ejecuta el comando de instalación:
    ```bash
    pm2-startup install
    ```
3.  Guarda la lista de procesos actuales (esto "congela" lo que está corriendo ahora para que se restaure al reiniciar):
    ```bash
    pm2 save
    ```

### En Linux
1.  Ejecuta el comando de startup (detectará tu sistema de inicio, ej. systemd):
    ```bash
    pm2 startup
    ```
2.  Copia y pega el comando que te muestre la terminal.
3.  Guarda la lista de procesos:
    ```bash
    pm2 save
    ```

## 6. Comandos Útiles de Mantenimiento

Deja estos comandos a mano para el soporte técnico:

*   **Ver estado:** `pm2 status`
*   **Ver logs (errores/actividad):** `pm2 logs farmacia-app`
*   **Reiniciar la app:** `pm2 restart farmacia-app`
*   **Detener la app:** `pm2 stop farmacia-app`
*   **Monitor en tiempo real:** `pm2 monit` (Muestra uso de CPU, memoria y logs en vivo).
*   **Listar procesos:** `pm2 list` (Muestra una tabla con todas las apps corriendo y su estado).

## Resumen para el Cliente

El sistema es automático. Si se va la luz o se reinicia el servidor, **Farmacia Ultimate** volverá a iniciar automáticamente gracias a PM2. No es necesario abrir ninguna ventana negra ni ejecutar comandos manualmente.

## 7. Solución de Problemas Comunes (Troubleshooting)

Esta sección documenta soluciones a errores específicos encontrados durante la preparación para producción.

### 7.1 Error: "Failed to find Server Action"
*   **Síntoma:** La aplicación carga pero al intentar iniciar sesión o realizar acciones, aparece este error en los logs o en pantalla.
*   **Causa:** Desincronización entre el código del cliente (navegador) y el servidor, a menudo causado por cachés antiguas o actualizaciones de esquema de base de datos sin reconstruir.
*   **Solución:**
    1.  Detener la aplicación: `pm2 stop farmacia-app`
    2.  Eliminar la carpeta `.next` en el servidor para limpiar la caché de construcción.
    3.  Ejecutar `npm run build` nuevamente.
    4.  Reiniciar la aplicación: `pm2 restart farmacia-app`

### 7.2 Error de Construcción: "Module not found: Can't resolve '@hookform/resolvers/zod'"
*   **Síntoma:** El comando `npm run build` falla mencionando este módulo.
*   **Causa:** Incompatibilidad de versiones. La versión 5.x de `@hookform/resolvers` puede tener conflictos con ciertas versiones de `zod`.
*   **Solución:**
    *   Verificar que `package.json` tenga la versión probada y funcional: `"@hookform/resolvers": "3.9.1"`.
    *   Si se actualizó accidentalmente, ejecutar: `npm install @hookform/resolvers@3.9.1`

### 7.3 Error de Construcción: "Prerender Error" en páginas `/locked` o `/reset-password`
*   **Síntoma:** El build falla diciendo "Error occurred prerendering page...".
*   **Causa:** Uso de `useSearchParams` en componentes de cliente sin envolverlos en un límite de `Suspense`. Next.js requiere esto para páginas estáticas.
*   **Solución:**
    *   Asegurarse de que cualquier página que use `useSearchParams` esté envuelta en `<Suspense>`.
    *   Ejemplo de corrección aplicada:
        ```tsx
        export default function Page() {
          return (
            <Suspense fallback={<div>Cargando...</div>}>
              <ContenidoDeLaPagina />
            </Suspense>
          );
        }
        ```

### 7.4 Error de Prisma: "Relation field missing"
*   **Síntoma:** Error al ejecutar `npx prisma generate`.
*   **Solución:** Asegurarse de que el archivo `prisma/schema.prisma` tenga todas las relaciones bidireccionales definidas correctamente. Si se agrega una relación en un modelo, debe existir su contraparte en el modelo relacionado.
