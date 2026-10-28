// fix-credit-note-index.mjs — Reparador dinámico de colisiones índice UNIQUE / FK.
//
// PROBLEMA (producción MySQL):
//   npx prisma db push falla con:
//     Error: Cannot drop index '<Tabla>_<col>_key': needed in a foreign key constraint
//   y aborta la sincronización del resto del esquema (tablas employee, columna
//   product.unitsPerBulk, etc.). El caso principal es CreditNote_invoiceId_key.
//
// CAUSA:
//   Una migración histórica creó un índice UNIQUE sobre una columna que hoy es
//   una Foreign Key. MySQL reutiliza ese índice UNIQUE para satisfacer la FK.
//   El schema.prisma actual modela esa columna como relación 1-a-muchos con un
//   @@index NO único. Prisma intenta DROP el índice UNIQUE, pero MySQL lo
//   rechaza porque la FK depende de él.
//
// SOLUCIÓN (idempotente, sin pérdida de datos, 100% dinámica):
//   1. Lee schema.prisma para conocer los índices deseados.
//   2. Inspecciona information_schema de la BD DESTINO y descubre los nombres
//      EXACTOS de índices y Foreign Keys (no se hardcodea ningún sufijo).
//   3. Antes de tocar CreditNote, verifica en information_schema el nombre real
//      de la FK y que siga apuntando a la tabla/columna esperadas.
//   4. Crea el índice NO único que respalda la FK.
//   5. Elimina el índice UNIQUE obsoleto. Si MySQL aún exige la FK, la elimina
//      y la recrea con su nombre real, tabla/columnas destino y reglas
//      ON DELETE / ON UPDATE originales.
//   6. Verifica el resultado final antes de informar éxito.
//
// USO:
//   node scripts/fix-credit-note-index.mjs [--dry-run] [--db-url=mysql://...]
//
// El script NO importa '@prisma/client' en el proceso principal (ejecuta las
// consultas en subprocesos) para evitar el lock EPERM del query_engine DLL en
// Windows (ver prisma-safe-deploy.mjs).
import { execSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const dryRun = process.argv.includes('--dry-run');
const dbUrlArg = process.argv.find((a) => a.startsWith('--db-url='));
const norm = (value) => String(value).toLowerCase();

function loadDatabaseUrl() {
  if (dbUrlArg) return dbUrlArg.slice('--db-url='.length);
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const envPath = resolve(root, '.env');
  if (existsSync(envPath)) {
    const src = readFileSync(envPath, 'utf8');
    const match = src.match(/^\s*DATABASE_URL\s*=\s*"?([^"\r\n]+)"?/m);
    if (match) return match[1];
  }
  throw new Error('No se encontró DATABASE_URL (use --db-url= o el archivo .env).');
}

const DATABASE_URL = loadDatabaseUrl();

function maskUrl(url) {
  return url.replace(/(mysql:\/\/[^:@/]+:)[^@]*@/i, '$1******@');
}

// ═══════════════════════════════════════════════════════════════════════════════
// Subproceso Prisma (evita el lock EPERM de la DLL en Windows)
// ═══════════════════════════════════════════════════════════════════════════════
function runChild(fn, payload = {}) {
  const bootstrap = [
    "import { PrismaClient } from '@prisma/client';",
    'const p = new PrismaClient({ datasources: { db: { url: process.env.FIX_DB_URL } } });',
    "const out = (value) => console.log('@@RESULT@@' + JSON.stringify(value));",
    "const payload = JSON.parse(process.env.FIX_PAYLOAD || '{}');",
    `const fn = ${fn.toString()};`,
    '(async () => {',
    '  try { out({ ok: true, value: await fn(p, payload) }); }',
    '  catch (error) { out({ ok: false, error: String(error?.message ?? error?.code ?? error) }); }',
    '  finally { await p.$disconnect().catch(() => {}); }',
    '})();',
  ].join('\n');

  let raw;
  try {
    raw = execSync('node --input-type=module -', {
      input: bootstrap,
      stdio: ['pipe', 'pipe', 'inherit'],
      encoding: 'utf8',
      maxBuffer: 16 * 1024 * 1024,
      env: {
        ...process.env,
        FIX_DB_URL: DATABASE_URL,
        FIX_PAYLOAD: JSON.stringify(payload),
      },
    });
  } catch (error) {
    throw new Error(`No se pudo ejecutar el subproceso de Prisma: ${error?.message || error}`);
  }

  const line = raw.split(/\r?\n/).find((item) => item.startsWith('@@RESULT@@'));
  if (!line) throw new Error('Sin respuesta del subproceso Prisma.');
  return JSON.parse(line.slice('@@RESULT@@'.length));
}

function callChild(fn, payload = {}) {
  const result = runChild(fn, payload);
  if (!result.ok) throw new Error(result.error);
  return result.value;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Funciones que se ejecutan dentro del subproceso
// ═══════════════════════════════════════════════════════════════════════════════
async function childIntrospect(p) {
  const query = (sql, ...args) => p.$queryRawUnsafe(sql, ...args);

  const databaseRows = await query('SELECT DATABASE() AS db, VERSION() AS version');
  const tableRows = await query(
    'SELECT table_name AS t FROM information_schema.tables WHERE table_schema = DATABASE()',
  );
  const indexRows = await query(
    'SELECT table_name AS t, index_name AS name, CAST(non_unique AS UNSIGNED) AS non_unique, ' +
      'seq_in_index AS seq, column_name AS col ' +
      'FROM information_schema.statistics WHERE table_schema = DATABASE() ' +
      'ORDER BY table_name, index_name, seq_in_index',
  );
  const fkRows = await query(
    'SELECT k.table_name AS t, k.constraint_name AS name, k.column_name AS col, ' +
      'k.ordinal_position AS pos, k.referenced_table_schema AS ref_schema, ' +
      'k.referenced_table_name AS ref_table, k.referenced_column_name AS ref_col, ' +
      'r.update_rule AS on_update, r.delete_rule AS on_delete ' +
      'FROM information_schema.key_column_usage k ' +
      'JOIN information_schema.referential_constraints r ' +
      '  ON r.constraint_schema = k.constraint_schema ' +
      ' AND r.constraint_name = k.constraint_name ' +
      ' AND r.table_name = k.table_name ' +
      'WHERE k.table_schema = DATABASE() AND k.referenced_table_name IS NOT NULL ' +
      'ORDER BY k.table_name, k.constraint_name, k.ordinal_position',
  );

  const text = (value) => (value === null || value === undefined ? '' : String(value));

  return {
    db: text(databaseRows[0]?.db),
    version: text(databaseRows[0]?.version),
    tables: tableRows.map((row) => text(row.t)),
    indexes: indexRows.map((row) => ({
      table: text(row.t),
      name: text(row.name),
      unique: Number(row.non_unique) === 0,
      seq: Number(row.seq),
      col: text(row.col),
    })),
    fks: fkRows.map((row) => ({
      table: text(row.t),
      name: text(row.name),
      col: text(row.col),
      pos: Number(row.pos),
      refSchema: text(row.ref_schema),
      refTable: text(row.ref_table),
      refCol: text(row.ref_col),
      onUpdate: text(row.on_update),
      onDelete: text(row.on_delete),
    })),
  };
}

async function childApply(p, plan) {
  const BT = String.fromCharCode(96);
  const quote = (value) => BT + String(value).replace(new RegExp(BT, 'g'), BT + BT) + BT;
  const lower = (value) => String(value).toLowerCase();
  const query = (sql, ...args) => p.$queryRawUnsafe(sql, ...args);
  const execute = (sql, ...args) => p.$executeRawUnsafe(sql, ...args);

  const table = plan.table;
  const column = plan.col;
  const uniqueNames = plan.uniqueIndexNames;
  const fkPlan = plan.fk;

  const safeRule = (value) => {
    const rule = String(value || '').toUpperCase();
    return ['RESTRICT', 'CASCADE', 'SET NULL', 'NO ACTION', 'SET DEFAULT'].includes(rule)
      ? rule
      : 'RESTRICT';
  };

  const databaseRows = await query('SELECT DATABASE() AS db');
  const database = String(databaseRows[0]?.db || '');

  const readIndexes = async () => {
    const rows = await query(
      'SELECT index_name AS name, CAST(non_unique AS UNSIGNED) AS non_unique, ' +
        'seq_in_index AS seq, column_name AS col ' +
        'FROM information_schema.statistics ' +
        'WHERE table_schema = DATABASE() AND table_name = ? ' +
        'ORDER BY index_name, seq_in_index',
      table,
    );
    const groups = new Map();
    for (const row of rows) {
      const name = String(row.name);
      if (!groups.has(name)) {
        groups.set(name, { name, unique: Number(row.non_unique) === 0, cols: [] });
      }
      groups.get(name).cols.push(String(row.col));
    }
    return [...groups.values()];
  };

  const readForeignKeys = async () => {
    const rows = await query(
      'SELECT k.constraint_name AS name, k.column_name AS col, k.ordinal_position AS pos, ' +
        'k.referenced_table_schema AS ref_schema, k.referenced_table_name AS ref_table, ' +
        'k.referenced_column_name AS ref_col, r.update_rule AS on_update, r.delete_rule AS on_delete ' +
        'FROM information_schema.key_column_usage k ' +
        'JOIN information_schema.referential_constraints r ' +
        '  ON r.constraint_schema = k.constraint_schema ' +
        ' AND r.constraint_name = k.constraint_name ' +
        ' AND r.table_name = k.table_name ' +
        'WHERE k.table_schema = DATABASE() AND k.table_name = ? ' +
        'ORDER BY k.constraint_name, k.ordinal_position',
      table,
    );
    const groups = new Map();
    for (const row of rows) {
      const name = String(row.name);
      if (!groups.has(name)) {
        groups.set(name, {
          name,
          cols: [],
          refCols: [],
          refSchema: String(row.ref_schema || database),
          refTable: String(row.ref_table),
          onUpdate: String(row.on_update),
          onDelete: String(row.on_delete),
        });
      }
      const fk = groups.get(name);
      fk.cols.push(String(row.col));
      fk.refCols.push(String(row.ref_col));
    }
    return [...groups.values()].filter(
      (fk) =>
        fk.cols.length === 1 &&
        lower(fk.cols[0]) === lower(column) &&
        lower(fk.refTable) === lower(fkPlan.refTable) &&
        lower(fk.refCols[0]) === lower(fkPlan.refCol),
    );
  };

  const addForeignKey = async (fk) => {
    const refSchema = fk.refSchema || database;
    const refColumns = fk.refCols.map((col) => quote(col)).join(', ');
    await execute(
      'ALTER TABLE ' +
        quote(table) +
        ' ADD CONSTRAINT ' +
        quote(fk.name) +
        ' FOREIGN KEY (' +
        quote(column) +
        ') REFERENCES ' +
        quote(refSchema) +
        '.' +
        quote(fk.refTable) +
        ' (' +
        refColumns +
        ') ON DELETE ' +
        safeRule(fk.onDelete) +
        ' ON UPDATE ' +
        safeRule(fk.onUpdate),
    );
  };

  let indexes = await readIndexes();
  const presentUnique = uniqueNames
    .map((name) => indexes.find((index) => lower(index.name) === lower(name)))
    .filter(Boolean);

  if (presentUnique.length === 0) {
    return {
      status: 'already',
      message: 'Los índices UNIQUE obsoletos ya no existen.',
      plainName: indexes.find((index) => !index.unique && lower(index.cols[0]) === lower(column))?.name || null,
      uniqueIndexes: [],
      fkName: (await readForeignKeys())[0]?.name || null,
      fallbackUsed: false,
      createdPlain: false,
    };
  }

  let foreignKeys = await readForeignKeys();
  if (foreignKeys.length === 0) {
    return {
      status: 'skipped',
      message:
        'La FK no existe o no coincide con la relación esperada en information_schema. ' +
        'Se omite para no alterar la integridad referencial.',
    };
  }

  let foreignKey =
    foreignKeys.find((fk) => lower(fk.name) === lower(fkPlan.name)) || foreignKeys[0];

  let plainIndex = indexes.find(
    (index) => !index.unique && lower(index.cols[0]) === lower(column),
  );
  let createdPlain = false;
  let plainName = plainIndex?.name || null;

  if (!plainIndex) {
    const usedNames = new Set(indexes.map((index) => lower(index.name)));
    const candidates = [
      plan.desiredPlainIndexName,
      `${table}_${column}_fk_idx`,
      `${table}_${column}_idx2`,
      `${table}_${column}_fk`,
      `${table}_${column}_idx_${Date.now()}`,
    ];
    plainName = candidates.find((name) => name && !usedNames.has(lower(name)));
    if (!plainName) throw new Error('No se pudo determinar un nombre libre para el índice no único.');

    await execute(
      'CREATE INDEX ' + quote(plainName) + ' ON ' + quote(table) + ' (' + quote(column) + ')',
    );
    createdPlain = true;
    indexes = await readIndexes();
  }

  const plainAvailable = indexes.some(
    (index) => !index.unique && lower(index.cols[0]) === lower(column),
  );
  if (!plainAvailable) {
    throw new Error('El índice no único de respaldo no quedó disponible; se aborta el DROP.');
  }

  let fallbackUsed = false;
  const dropped = [];

  for (const uniqueIndex of presentUnique) {
    indexes = await readIndexes();
    const stillPresent = indexes.some(
      (index) => lower(index.name) === lower(uniqueIndex.name),
    );
    if (!stillPresent) {
      dropped.push({ name: uniqueIndex.name, alreadyGone: true });
      continue;
    }

    try {
      await execute(
        'ALTER TABLE ' + quote(table) + ' DROP INDEX ' + quote(uniqueIndex.name),
      );
    } catch (error) {
      const message = String(error?.message || error);
      if (!/foreign key constraint/i.test(message)) throw error;

      fallbackUsed = true;
      foreignKeys = await readForeignKeys();
      if (foreignKeys.length === 0) {
        throw new Error(
          'MySQL exige la FK, pero information_schema ya no la reporta. ' +
            'Se cancela el DROP para no romper la integridad.',
        );
      }

      const current = foreignKeys.find((fk) => lower(fk.name) === lower(foreignKey.name)) || foreignKeys[0];
      await execute(
        'ALTER TABLE ' + quote(table) + ' DROP FOREIGN KEY ' + quote(current.name),
      );

      try {
        await execute(
          'ALTER TABLE ' + quote(table) + ' DROP INDEX ' + quote(uniqueIndex.name),
        );
      } catch (dropError) {
        try {
          await addForeignKey(current);
        } catch (restoreError) {
          throw new Error(
            'Falló el DROP del índice y no se pudo restaurar la FK: ' +
              String(restoreError?.message || restoreError),
          );
        }
        throw dropError;
      }

      try {
        await addForeignKey(current);
      } catch (addError) {
        try {
          await execute(
            'ALTER TABLE ' +
              quote(table) +
              ' ADD UNIQUE INDEX ' +
              quote(uniqueIndex.name) +
              ' (' +
              quote(column) +
              ')',
          );
          await addForeignKey(current);
        } catch (restoreError) {
          throw new Error(
            'No se pudo recrear la FK ' +
              current.name +
              ' ni restaurar el UNIQUE ' +
              uniqueIndex.name +
              ': ' +
              String(restoreError?.message || restoreError),
          );
        }
        throw new Error(
          'No se pudo recrear la FK ' +
            current.name +
            ' con el índice no único; se restauró el UNIQUE ' +
            uniqueIndex.name +
            '. Detalle: ' +
            String(addError?.message || addError),
        );
      }
      foreignKey = current;
    }

    dropped.push({ name: uniqueIndex.name, alreadyGone: false });
  }

  const finalIndexes = await readIndexes();
  const remainingUnique = finalIndexes.filter((index) =>
    presentUnique.some((item) => lower(item.name) === lower(index.name)),
  );
  if (remainingUnique.length > 0) {
    throw new Error(
      'El índice UNIQUE sigue presente: ' + remainingUnique.map((index) => index.name).join(', '),
    );
  }

  const finalPlain = finalIndexes.find(
    (index) => !index.unique && lower(index.cols[0]) === lower(column),
  );
  if (!finalPlain) {
    throw new Error('No quedó un índice no único que respalde la FK.');
  }

  const finalForeignKeys = await readForeignKeys();
  if (finalForeignKeys.length === 0) {
    throw new Error('La FK desapareció después de la reparación.');
  }

  return {
    status: 'applied',
    plainName: finalPlain.name,
    uniqueIndexes: dropped,
    fkName: finalForeignKeys[0].name,
    fallbackUsed,
    createdPlain,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// Lectura de schema.prisma
// ═══════════════════════════════════════════════════════════════════════════════
function parseSchema() {
  const schemaPath = resolve(root, 'prisma/schema.prisma');
  const src = readFileSync(schemaPath, 'utf8');
  const models = new Map();
  const modelRe = /model\s+(\w+)\s*\{([\s\S]*?)\n\}/g;

  let match;
  while ((match = modelRe.exec(src))) {
    const modelName = match[1];
    const body = match[2];
    const mapMatch = body.match(/@@map\(\s*"([^"]+)"\s*\)/);
    const meta = {
      map: mapMatch ? mapMatch[1] : modelName,
      uniqueCols: new Set(),
      plainIndexCols: new Set(),
      uniqueIndexCols: new Set(),
      desiredPlainIndexNames: new Map(),
    };

    for (const line of body.split('\n')) {
      const column = line.match(/^\s*(\w+)\s+[\w\[\]?]+.*@unique\b/);
      if (column && !line.includes('@@')) meta.uniqueCols.add(column[1]);
    }

    for (const unique of body.matchAll(/@@unique\(\s*\[([^\]]+)\](?:[^)]*map:\s*"([^"]+)")?/g)) {
      const columns = unique[1].split(',').map((col) => col.trim().replace(/`/g, ''));
      if (columns.length === 1) meta.uniqueIndexCols.add(columns[0]);
    }

    for (const index of body.matchAll(/@@index\(\s*\[([^\]]+)\](?:[^)]*map:\s*"([^"]+)")?/g)) {
      const columns = index[1].split(',').map((col) => col.trim().replace(/`/g, ''));
      if (columns.length === 1) {
        meta.plainIndexCols.add(columns[0]);
        if (index[2]) meta.desiredPlainIndexNames.set(columns[0], index[2]);
      }
    }

    models.set(modelName, meta);
  }

  return models;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Análisis de colisiones
// ═══════════════════════════════════════════════════════════════════════════════
function buildCatalog(info) {
  const tablesByLower = new Map(info.tables.map((table) => [norm(table), table]));

  const indexesByTable = new Map();
  for (const row of info.indexes) {
    const tableKey = norm(row.table);
    if (!indexesByTable.has(tableKey)) indexesByTable.set(tableKey, new Map());
    const byName = indexesByTable.get(tableKey);
    if (!byName.has(row.name)) {
      byName.set(row.name, { name: row.name, unique: row.unique, cols: [] });
    }
    byName.get(row.name).cols.push(row.col);
  }

  const fkGroups = new Map();
  for (const row of info.fks) {
    const key = `${norm(row.table)}|${norm(row.name)}`;
    if (!fkGroups.has(key)) {
      fkGroups.set(key, {
        table: row.table,
        name: row.name,
        cols: [],
        refCols: [],
        refSchema: row.refSchema,
        refTable: row.refTable,
        onUpdate: row.onUpdate,
        onDelete: row.onDelete,
      });
    }
    const fk = fkGroups.get(key);
    fk.cols.push(row.col);
    fk.refCols.push(row.refCol);
  }

  const fksPerTable = new Map();
  for (const fk of fkGroups.values()) {
    const key = norm(fk.table);
    if (!fksPerTable.has(key)) fksPerTable.set(key, []);
    fksPerTable.get(key).push(fk);
  }

  const incomingRefs = new Set();
  for (const fk of fkGroups.values()) {
    for (const refCol of fk.refCols) {
      incomingRefs.add(`${norm(fk.refTable)}|${norm(refCol)}`);
    }
  }

  return { tablesByLower, indexesByTable, fksPerTable, incomingRefs };
}

function analyze(models, catalog) {
  const collisions = [];
  const skipped = [];

  for (const [modelName, meta] of models) {
    const actualTable = catalog.tablesByLower.get(norm(meta.map));
    if (!actualTable) continue;

    const tableKey = norm(actualTable);
    const indexes = [...(catalog.indexesByTable.get(tableKey)?.values() || [])];
    const tableFks = catalog.fksPerTable.get(tableKey) || [];

    for (const fk of tableFks) {
      if (fk.cols.length !== 1) continue;

      const column = fk.cols[0];
      const schemaWantsUnique =
        [...meta.uniqueCols].some((item) => norm(item) === norm(column)) ||
        [...meta.uniqueIndexCols].some((item) => norm(item) === norm(column));
      if (schemaWantsUnique) continue;

      const covering = indexes.filter(
        (index) => norm(index.cols[0]) === norm(column),
      );
      if (covering.length === 0) continue;

      const plainCovering = covering.filter((index) => !index.unique);
      const uniqueSingle = covering.filter(
        (index) => index.unique && index.cols.length === 1 && norm(index.name) !== 'primary',
      );
      const uniqueComposite = covering.filter(
        (index) => index.unique && index.cols.length > 1,
      );

      if (uniqueSingle.length === 0) {
        if (uniqueComposite.length > 0) {
          skipped.push({
            table: actualTable,
            column,
            reason:
              'índice UNIQUE compuesto sobre la FK; se omite por seguridad para no romper el schema.',
          });
        }
        continue;
      }

      if (plainCovering.length > 0) continue;

      if (catalog.incomingRefs.has(`${tableKey}|${norm(column)}`)) {
        skipped.push({
          table: actualTable,
          column,
          reason:
            'la columna es referenciada por otra FK; su índice UNIQUE no puede eliminarse.',
        });
        continue;
      }

      collisions.push({
        modelName,
        table: actualTable,
        col: column,
        fk: {
          name: fk.name,
          refSchema: fk.refSchema,
          refTable: fk.refTable,
          refCol: fk.refCols[0],
          refCols: fk.refCols,
          onUpdate: fk.onUpdate,
          onDelete: fk.onDelete,
        },
        uniqueIndexNames: uniqueSingle.map((index) => index.name),
        desiredPlainIndexName:
          [...meta.desiredPlainIndexNames.entries()].find(
            ([item]) => norm(item) === norm(column),
          )?.[1] || `${modelName}_${column}_idx`,
      });
    }
  }

  return { collisions, skipped };
}

// ═══════════════════════════════════════════════════════════════════════════════
// Flujo principal
// ═══════════════════════════════════════════════════════════════════════════════
function printHeader() {
  console.log('');
  console.log('========================================================');
  console.log('  OMNI POS :: Reparador de índices UNIQUE / FK');
  console.log(`  BD destino : ${maskUrl(DATABASE_URL)}`);
  console.log(`  Modo       : ${dryRun ? 'DRY-RUN (sin cambios)' : 'APLICAR'}`);
  console.log('========================================================');
  console.log('');
}

function printPlan(collision, index) {
  const fk = collision.fk;
  console.log(`  ${index}. ${collision.table}.${collision.col} (modelo ${collision.modelName})`);
  console.log(
    `     FK detectada en information_schema: ${fk.name} -> ${fk.refTable}.${fk.refCol}`,
  );
  console.log(`     Reglas originales: ON DELETE ${fk.onDelete} / ON UPDATE ${fk.onUpdate}`);
  console.log(`     Índice UNIQUE obsoleto: ${collision.uniqueIndexNames.join(', ')}`);
  console.log(`     Índice no único a crear: ${collision.desiredPlainIndexName}`);
}

function main() {
  printHeader();

  const info = callChild(childIntrospect);
  console.log(`[1/4] Conexión MySQL OK: ${info.db} (MySQL ${info.version})`);

  const models = parseSchema();
  console.log(`[2/4] schema.prisma leído: ${models.size} modelos`);

  const catalog = buildCatalog(info);
  const { collisions, skipped } = analyze(models, catalog);
  console.log(
    `[3/4] Revisión de índices/FK: ${collisions.length} colisión(es), ${skipped.length} omitida(s)`,
  );

  for (const item of skipped) {
    console.log(`      [AVISO] ${item.table}.${item.column}: ${item.reason}`);
  }

  if (collisions.length === 0) {
    console.log('');
    console.log('[4/4] No hay colisiones UNIQUE/FK que reparar.');
    console.log('      La base está lista para: npx prisma db push --accept-data-loss');
    console.log('');
    return;
  }

  if (dryRun) {
    console.log('');
    console.log('[4/4] Plan de reparación (no se aplicó ningún cambio):');
    collisions.forEach((collision, index) => printPlan(collision, index + 1));
    console.log('');
    console.log('      Ejecute sin --dry-run para aplicar la reparación.');
    console.log('');
    return;
  }

  console.log('');
  console.log('[4/4] Aplicando reparaciones...');

  let repaired = 0;
  let omitted = 0;
  let failed = 0;

  for (const collision of collisions) {
    console.log('');
    console.log(`  • ${collision.table}.${collision.col}`);
    console.log(`      FK verificada dinámicamente: ${collision.fk.name}`);
    console.log(`      UNIQUE obsoleto: ${collision.uniqueIndexNames.join(', ')}`);
    console.log(`      Índice no único objetivo: ${collision.desiredPlainIndexName}`);

    try {
      const result = callChild(childApply, collision);

      if (result.status === 'skipped') {
        console.log(`      [AVISO] ${result.message}`);
        omitted += 1;
        continue;
      }

      if (result.createdPlain) {
        console.log(`      ✓ Índice no único creado: ${result.plainName}`);
      } else {
        console.log(`      ✓ Índice no único disponible: ${result.plainName}`);
      }

      for (const item of result.uniqueIndexes) {
        console.log(
          `      ✓ UNIQUE eliminado: ${item.name}${item.alreadyGone ? ' (ya no existía)' : ''}`,
        );
      }

      if (result.fallbackUsed) {
        console.log(`      ✓ FK recreada con su nombre real: ${result.fkName}`);
      } else {
        console.log(`      ✓ FK conservada: ${result.fkName}`);
      }

      console.log(
        `      ✓ Verificación final: FK activa y respaldada por ${result.plainName}`,
      );
      repaired += 1;
    } catch (error) {
      console.error(`      [ERROR] ${error?.message || error}`);
      failed += 1;
    }
  }

  console.log('');
  console.log('--------------------------------------------------------');
  console.log(
    `Resultado: ${repaired} reparada(s), ${omitted} omitida(s), ${failed} con error.`,
  );

  if (failed > 0) {
    console.log('Corrija los errores anteriores antes de ejecutar prisma db push.');
    console.log('--------------------------------------------------------');
    console.log('');
    process.exitCode = 1;
    return;
  }

  console.log('La base está lista para: npx prisma db push --accept-data-loss');
  console.log('--------------------------------------------------------');
  console.log('');
}

try {
  main();
} catch (error) {
  console.error('');
  console.error('[fix-credit-note-index] ERROR:', error?.message || error);
  process.exit(1);
}
