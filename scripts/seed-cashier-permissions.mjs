// Script de permisos para el rol Cajero (Cashier).
//
// 1) Activa la bandera REAL de crédito/cuotas/abonos: systemsettings.creditFinancingEnabled.
// 2) Si existieran "tablas legacy" de permisos (role / permission / rolepermission /
//    userpermission / pos_settings) — creadas por versiones o bases anteriores — inserta/asegura
//    los permisos de Cotizaciones y Abonos a Clientes para el rol Cajero.
//
// El proyecto ACTUAL no usa tablas de permisos: el control se hace por `user.role` en código.
// Este script es idempotente, seguro de ejecutar en producción y no toca datos de ventas.
import 'dotenv/config';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { PrismaClient } = require('@prisma/client');

const db = new PrismaClient();

// Permisos que el Cajero debe tener para Cotizaciones y Abonos / Cuotas.
const CASHIER_PERMISSIONS = [
  'QUOTATION_CREATE',
  'QUOTATION_VIEW',
  'QUOTATION_UPDATE',
  'QUOTATION_CANCEL',
  'QUOTATION_CONVERT',
  'CUSTOMER_PAYMENT',
  'CREDIT_PAYMENT',
  'CREDIT_PAYMENT_VIEW',
];

const ROLE_MATCHERS = ['cashier', 'cajero'];

async function rows(query, params = []) {
  return db.$queryRawUnsafe(query, ...params);
}

async function tableExists(name) {
  const r = await rows(
    `SELECT COUNT(*) AS n FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ?`,
    [name]
  );
  return !!r && Number(r[0].n) > 0;
}

async function getTablesLike(pattern) {
  const r = await rows(
    `SELECT table_name AS n FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name LIKE ?`, [pattern]
  );
  return (r || []).map((x) => x.n);
}

async function getColumns(table) {
  const r = await rows(
    `SELECT column_name AS c, column_key AS k FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ?`,
    [table]
  );
  return (r || []).map((x) => ({ name: x.c, isKey: x.k !== '' && x.k !== null }));
}

function pickColumn(cols, candidates, fallback) {
  for (const c of candidates) {
    const hit = cols.find((col) => col.name.toLowerCase() === c.toLowerCase());
    if (hit) return hit;
  }
  return cols.find((col) => col.isKey) || cols.find((col) => col.name === fallback) || null;
}

async function main() {
  const report = { settings: [], permissions: [] };

  // ---------------------------------------------------------------------
  // 1) Activar crédito / cuotas / abonos a nivel global (única fuente real).
  // ---------------------------------------------------------------------
  if (await tableExists('systemsettings')) {
    const settingsCols = await getColumns('systemsettings');
    const hasCreditCol = settingsCols.some((c) => c.name.toLowerCase() === 'creditfinancingenabled');
    const idCol = pickColumn(settingsCols, ['id'], 'id');
    const orderCol = settingsCols.find((c) => c.name.toLowerCase() === 'updatedat')
      || settingsCols.find((c) => c.name.toLowerCase() === 'createdat')
      || idCol;
    const current = await rows(
      `SELECT ${idCol.name} AS id, ${hasCreditCol ? 'creditFinancingEnabled AS cf' : '1 AS cf'} FROM systemsettings ORDER BY ${orderCol.name} ASC LIMIT 1`
    );
    const target = current && current[0] ? current[0] : null;
    if (target) {
      if (!hasCreditCol) {
        report.settings.push('systemsettings existe pero NO tiene columna creditFinancingEnabled (se omite).');
        console.log('[WARN] systemsettings no tiene creditFinancingEnabled; el esquema actual no la soporta. Se omite.');
      } else if (Number(target.cf) === 1) {
        report.settings.push('creditFinancingEnabled ya estaba ACTIVADO.');
        console.log('[OK] systemsettings: creditFinancingEnabled ya está en 1.');
      } else {
        await db.$executeRawUnsafe(
          `UPDATE systemsettings SET creditFinancingEnabled = 1 WHERE id = ?`,
          target.id
        );
        report.settings.push('creditFinancingEnabled activado (0 -> 1).');
        console.log('[OK] systemsettings: creditFinancingEnabled => 1 (actualizado).');
      }
    } else {
      const createdAtCol = settingsCols.find((c) => c.name.toLowerCase() === 'createdat');
      const upsertCol = hasCreditCol ? 'creditFinancingEnabled' : null;
      if (upsertCol) {
        await db.$executeRawUnsafe(
          `INSERT INTO systemsettings (${createdAtCol ? 'createdAt, ' : ''}updatedAt, ${upsertCol})
           VALUES (${createdAtCol ? 'NOW(), ' : ''}NOW(), 1)`
        );
        report.settings.push('systemsettings vacío: fila creada con creditFinancingEnabled = 1.');
        console.log('[OK] systemsettings: fila creada con creditFinancingEnabled = 1.');
      } else {
        console.log('[WARN] systemsettings vacío y sin columna creditFinancingEnabled; no se puede activar la bandera. Se omite.');
      }
    }
  } else {
    report.settings.push('tabla systemsettings no encontrada.');
    console.log('[SKIP] no existe la tabla systemsettings.');
  }

  // ---------------------------------------------------------------------
  // 2) Tabla legacy pos_settings (si existiera de versiones anteriores).
  // ---------------------------------------------------------------------
  const posSettingsTables = await getTablesLike('%pos_setting%');
  if (posSettingsTables.length > 0) {
    const posTable = posSettingsTables[0];
    const cols = await getColumns(posTable);
    const hasEnable = cols.some((c) => c.name.toLowerCase() === 'enable_quotations');
    if (hasEnable) {
      await db.$executeRawUnsafe(`UPDATE ${posTable} SET enable_quotations = 1`);
      report.permissions.push(`pos_settings: enable_quotations = 1 (tabla legacy ${posTable}).`);
      console.log(`[OK] pos_settings (${posTable}): enable_quotations => 1.`);
    } else {
      console.log(`[WARN] ${posTable} sin columna enable_quotations; se omite.`);
    }
  } else {
    console.log('[SKIP] no existe tabla legacy pos_settings; el sistema actual no usa enable_quotations.');
  }

  // ---------------------------------------------------------------------
  // 3) Permisos legacy (solo si existen tablas de seguridad legacy).
  //    Descubrimiento genérico por nombre, sin asumir columnas hardcodeadas.
  // ---------------------------------------------------------------------
  const roleTables = await getTablesLike('%role%');
  const permTables = await getTablesLike('%permission%');

  const roleTable = roleTables.find((n) => /^(role|roles|user_roles)$/i.test(n));
  const permissionTable = permTables.find((n) => /^permission(s)?$/i.test(n));
  const rolePermJoin = permTables.find((n) => /(role.*perm|permission.*role)/i.test(n) && n.toLowerCase() !== 'permission' && n.toLowerCase() !== 'permissions');

  if (!roleTable || !permissionTable) {
    console.log('[SKIP] no existen tablas legacy role/permission; los permisos se controlan por user.role en código.');
  } else {
    const roleCols = await getColumns(roleTable);
    const permCols = await getColumns(permissionTable);

    const roleId = pickColumn(roleCols, ['role_id', 'id'], 'id');
    const roleName = pickColumn(roleCols, ['role_name', 'name', 'rolename'], 'name');
    const permId = pickColumn(permCols, ['permission_id', 'id'], 'id');
    const permName = pickColumn(permCols, ['permission_name', 'name', 'permname'], 'name');

    if (!roleId || !roleName || !permId || !permName) {
      console.log('[SKIP] no se pudieron identificar columnas de role/permission (esquema legacy desconocido).');
    } else {
      const roleRows = await rows(
        `SELECT ${roleId.name} AS id, ${roleName.name} AS n FROM ${roleTable}`
      );
      const cashierRole = (roleRows || []).find((r) =>
        ROLE_MATCHERS.some((m) => String(r.n).toLowerCase().includes(m))
      );

      if (!cashierRole) {
        console.log('[SKIP] no se encontró un rol tipo "cashier/cajero" en la tabla legacy de roles.');
      } else {
        console.log(`[OK] Rol legacy encontrado: "${cashierRole.n}" (${cashierRole.id}).`);
        for (const perm of CASHIER_PERMISSIONS) {
          // Insertar el permiso si no existe.
          const existing = await rows(
            `SELECT ${permId.name} AS id FROM ${permissionTable} WHERE ${permName.name} = ? LIMIT 1`,
            [perm]
          );
          let permRowId = existing && existing[0] ? existing[0].id : null;
          if (!permRowId) {
            const insertCols = permCols.map((c) => c.name).join(', ');
            const placeholders = permCols.map((c) => (c.name === permName.name ? '?' : c.isKey ? 'UUID()' : 'NULL')).join(', ');
            const dyn = rows(
              `INSERT INTO ${permissionTable} (${insertCols}) VALUES (${placeholders})`,
              [perm]
            );
            await dyn;
            const created = await rows(
              `SELECT ${permId.name} AS id FROM ${permissionTable} WHERE ${permName.name} = ? LIMIT 1`,
              [perm]
            );
            permRowId = created && created[0] ? created[0].id : permRowId;
          }

          if (permRowId && rolePermJoin) {
            const joinCols = await getColumns(rolePermJoin);
            const jRole = pickColumn(joinCols, ['role_id', 'roleid'], 'role_id');
            const jPerm = pickColumn(joinCols, ['permission_id', 'permissionid'], 'permission_id');
            const joined = await rows(
              `SELECT 1 AS x FROM ${rolePermJoin} WHERE ${jRole.name} = ? AND ${jPerm.name} = ? LIMIT 1`,
              [cashierRole.id, permRowId]
            );
            if (!joined || joined.length === 0) {
              const otherCols = joinCols.filter((c) => c.name !== jRole.name && c.name !== jPerm.name);
              const insertCols = `${jRole.name}, ${jPerm.name}` + (otherCols.length ? `, ${otherCols.map((c) => c.name).join(', ')}` : '');
              const placeholders = `?, ?` + (otherCols.length ? `, ${otherCols.map(() => 'NOW()').join(', ')}` : '');
              await rows(
                `INSERT INTO ${rolePermJoin} (${insertCols}) VALUES (${placeholders})`,
                [cashierRole.id, permRowId]
              );
              report.permissions.push(`${perm} -> rol "${cashierRole.n}" (nuevo).`);
            } else {
              report.permissions.push(`${perm} -> rol "${cashierRole.n}" (ya existía).`);
            }
          } else if (permRowId) {
            report.permissions.push(`${perm} insertado en ${permissionTable} (sin tabla de relación).`);
          }
        }
        console.log(`[OK] Permisos de Cotización/Abonos asegurados para el rol "${cashierRole.n}":`);
        report.permissions.forEach((p) => console.log(`     - ${p}`));
      }
    }
  }

  console.log('---');
  console.log('Resumen:', JSON.stringify(report, null, 2));
  console.log('Fin de seed-cashier-permissions.');
}

main()
  .catch((e) => {
    console.error('ERROR en seed-cashier-permissions:', e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });