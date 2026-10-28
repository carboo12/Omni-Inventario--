import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '../.env') });

const rawUrl = process.env.DATABASE_URL;

console.log('========================================================');
console.log('  DIAGNOSTICO DE CONEXION MYSQL Y ESQUEMA PRISMA');
console.log('========================================================\n');

if (!rawUrl) {
  console.error('❌ ERROR: No se encontro la variable DATABASE_URL en el archivo .env');
  console.error('   Verifique que exista el archivo .env con la linea:');
  console.error('   DATABASE_URL="mysql://root:TU_PASSWORD@localhost:3306/farmacia"\n');
  process.exit(1);
}

// Ocultar contraseña para impresion segura
let maskedUrl = rawUrl;
try {
  const parsed = new URL(rawUrl.replace(/^mysql:\/\//, 'http://'));
  if (parsed.password) {
    maskedUrl = rawUrl.replace(`:${parsed.password}@`, ':******@');
  }
} catch {
  maskedUrl = '(formato de URL no estandar)';
}

console.log(`[INFO] Cadena detectada: ${maskedUrl}`);

const prisma = new PrismaClient({
  log: ['error'],
});

async function run() {
  try {
    console.log('[1/3] Probando conexion con MySQL...');
    await prisma.$queryRaw`SELECT 1 as test_connection`;
    console.log('   ✔ Conexion exitosa a MySQL Server.\n');

    console.log('[2/3] Verificando base de datos activa...');
    const dbNameResult = await prisma.$queryRaw`SELECT DATABASE() as db_name`;
    const dbName = Array.isArray(dbNameResult) && dbNameResult[0]?.db_name ? dbNameResult[0].db_name : 'desconocida';
    console.log(`   ✔ Base de datos seleccionada: '${dbName}'\n`);

    console.log('[3/3] Verificando esquema y columna unitsPerBulk...');
    const columns = await prisma.$queryRaw`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'product' 
        AND COLUMN_NAME = 'unitsPerBulk'
    `;

    if (Array.isArray(columns) && columns.length > 0) {
      console.log('   ✔ Columna unitsPerBulk PRESENTE en la tabla product.');
      console.log('   ✔ El esquema esta debidamente sincronizado.\n');
    } else {
      console.log('   ⚠ AVISO: La columna unitsPerBulk NO existe todavia en la tabla product.');
      console.log('   -> Ejecute "update.bat" para sincronizar el esquema (prisma db push).\n');
    }

    console.log('========================================================');
    console.log('  ¡TODO CORRECTO! Credenciales validas y servidor listo.');
    console.log('========================================================');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ ERROR AL CONECTAR CON LA BASE DE DATOS:');
    
    const errCode = error?.code || '';
    const errMsg = error?.message || String(error);

    if (errCode === 'P1000' || errMsg.includes('Authentication failed')) {
      console.error('\n[DIAGNOSTICO P1000 - AUTENTICACION FALLIDA]');
      console.error('El usuario o la contrasena de MySQL en .env son INCORRECTOS.');
      console.error('\nSOLUCION:');
      console.error('1. Abra el archivo .env con el Bloc de Notas.');
      console.error('2. Corrija DATABASE_URL colocando la contrasena real de root:');
      console.error('   DATABASE_URL="mysql://root:CONTRASEÑA_REAL@localhost:3306/farmacia"');
      console.error('\n3. REGLA DE CARACTERES ESPECIALES:');
      console.error('   Si su contrasena tiene signos, codifiquelos:');
      console.error('   +  ->  %2B     (ej: MiClave+123 -> MiClave%2B123)');
      console.error('   @  ->  %40     (ej: Mi@Clave    -> Mi%40Clave)');
      console.error('   #  ->  %23');
      console.error('   :  ->  %3A');
      console.error('   /  ->  %2F');
    } else if (errCode === 'P1001' || errMsg.includes("Can't reach database server")) {
      console.error('\n[DIAGNOSTICO P1001 - SERVIDOR MYSQL NO RESPONDE]');
      console.error('No se pudo establecer conexion en el puerto 3306.');
      console.error('Verifique que el servicio "MySQL" este INICIADO en Windows (services.msc).');
    } else if (errCode === 'P1003' || errMsg.includes('database') && errMsg.includes('does not exist')) {
      console.error('\n[DIAGNOSTICO P1003 - BASE DE DATOS INEXISTENTE]');
      console.error('La base de datos indicada no existe.');
      console.error('Cree la base de datos en MySQL con:');
      console.error('CREATE DATABASE farmacia CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;');
    } else {
      console.error(errMsg);
    }

    console.error('\n========================================================');
    console.error('  Corrija el archivo .env y vuelva a ejecutar este script.');
    console.error('========================================================\n');
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

run();
