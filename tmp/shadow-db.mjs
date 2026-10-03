import { PrismaClient } from '@prisma/client';

// Conexion administrativa (base 'mysql') solo para crear la BD sombra.
const url = new URL(process.env.ADMIN_URL);
const admin = new PrismaClient({ datasources: { db: { url: process.env.ADMIN_URL } } });

const target = process.argv[2];
if (!target) { console.error('falta nombre de BD'); process.exit(1); }

try {
  const rows = await admin.$queryRawUnsafe(
    'SELECT SCHEMA_NAME FROM information_schema.SCHEMATA WHERE SCHEMA_NAME = ?',
    target
  );
  if (rows.length) {
    console.log(`La BD sombra "${target}" ya existe.`);
  } else {
    await admin.$executeRawUnsafe(
      `CREATE DATABASE \`${target}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
    console.log(`BD sombra "${target}" creada.`);
  }
} catch (e) {
  console.error('ERROR:', String(e.message).split('\n')[0]);
  process.exit(1);
} finally {
  await admin.$disconnect();
}