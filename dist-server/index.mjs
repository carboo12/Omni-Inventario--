import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);
var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// src/lib/db.ts
import { PrismaClient } from "@prisma/client";
var prismaClientSingleton, db, db_default;
var init_db = __esm({
  "src/lib/db.ts"() {
    "use strict";
    prismaClientSingleton = () => {
      return new PrismaClient({
        log: true ? ["warn", "error"] : ["error"]
      });
    };
    db = globalThis.prisma ?? prismaClientSingleton();
    db_default = db;
    if (true) globalThis.prisma = db;
  }
});

// src/lib/services/gold-inventory-service.ts
var GoldInventoryService;
var init_gold_inventory_service = __esm({
  "src/lib/services/gold-inventory-service.ts"() {
    "use strict";
    init_db();
    GoldInventoryService = class {
      /**
       * Adjusts stock for a specific karat and records the movement.
       * Unified with the general Kardex.
       * MUST be called within an existing Prisma transaction.
       */
      static async adjustStock(tx, data) {
        const { karat, grams, type, referenceId, userId } = data;
        const currentStock = await tx.goldStock.findUnique({
          where: { karat }
        });
        const previousQuantity = currentStock?.gramsAvailable || 0;
        const stock = await tx.goldStock.upsert({
          where: { karat },
          update: {
            gramsAvailable: { increment: grams }
          },
          create: {
            karat,
            gramsAvailable: grams
          }
        });
        if (stock.gramsAvailable < 0) {
          throw new Error(`Inventario insuficiente para oro de ${karat}K. Disponible: ${stock.gramsAvailable - grams}g.`);
        }
        await tx.goldMovement.create({
          data: {
            type,
            referenceId,
            karat,
            grams
          }
        });
        const movementTypeMap = {
          "PURCHASE": "Ingreso",
          "SALE": "Venta",
          "MELT": "Ajuste",
          "TRANSFORMATION": "Ajuste",
          "ADJUSTMENT": "Ajuste"
        };
        await tx.inventoryMovement.create({
          data: {
            timestamp: (/* @__PURE__ */ new Date()).toISOString(),
            productName: `Oro ${karat}K`,
            movementType: movementTypeMap[type] || "Ajuste",
            movementId: referenceId,
            quantityChange: grams,
            previousQuantity,
            newQuantity: stock.gramsAvailable,
            userId,
            inventoryType: "jewelry"
          }
        });
        return stock;
      }
      /**
       * Gets current available grams for a karat.
       */
      static async getAvailableGrams(karat) {
        const stock = await db_default.goldStock.findUnique({
          where: { karat }
        });
        return stock?.gramsAvailable || 0;
      }
    };
  }
});

// src/lib/services/jewelry-production-service.ts
var jewelry_production_service_exports = {};
__export(jewelry_production_service_exports, {
  JewelryProductionService: () => JewelryProductionService
});
async function generateNextCode(tx) {
  const lastPiece = await tx.jewelryPiece.findFirst({
    orderBy: { createdAt: "desc" },
    select: { code: true }
  });
  let nextCode = "1001";
  if (lastPiece?.code && !isNaN(Number(lastPiece.code))) {
    nextCode = (Number(lastPiece.code) + 1).toString();
  }
  return nextCode;
}
var JewelryProductionService;
var init_jewelry_production_service = __esm({
  "src/lib/services/jewelry-production-service.ts"() {
    "use strict";
    init_gold_inventory_service();
    JewelryProductionService = class {
      /**
       * Transforms gold grams into one or more identical Jewelry Pieces.
       * Supports quantity > 1 to batch-create pieces with the same specs.
       */
      static async transform(tx, data) {
        const quantity = Math.max(1, data.quantity ?? 1);
        const totalGramsUsed = data.gramsUsed * quantity;
        const pieces = [];
        for (let i = 0; i < quantity; i++) {
          const nextCode = await generateNextCode(tx);
          const piece = await tx.jewelryPiece.create({
            data: {
              code: nextCode,
              name: data.name,
              weight: data.gramsUsed,
              karat: data.karat,
              laborCost: data.laborCost,
              marginPercent: data.marginPercent,
              calculatedPrice: data.calculatedPrice,
              profitAmount: data.profitAmount,
              marketPriceUsed: data.marketPriceUsed,
              photoUrl: data.photoUrl,
              materialId: data.materialId,
              location: data.location || "A",
              status: "AVAILABLE"
            }
          });
          await tx.goldTransformation.create({
            data: {
              karat: data.karat,
              gramsUsed: data.gramsUsed,
              resultingPieceId: piece.id
            }
          });
          await tx.auditLog.create({
            data: {
              userId: data.userId,
              action: "GOLD_TRANSFORMATION",
              entity: "JewelryPiece",
              entityId: piece.id
            }
          });
          pieces.push(piece);
        }
        await GoldInventoryService.adjustStock(tx, {
          karat: data.karat,
          grams: -totalGramsUsed,
          type: "TRANSFORMATION",
          referenceId: pieces[0].id,
          userId: data.userId
        });
        return pieces;
      }
      /**
       * Directly registers existing physical jewelry pieces into inventory
       * WITHOUT consuming any gold stock. For pieces that already exist.
       * Supports quantity > 1 to batch-register identical pieces.
       */
      static async directEntry(tx, data) {
        const quantity = Math.max(1, data.quantity ?? 1);
        const pieces = [];
        for (let i = 0; i < quantity; i++) {
          const nextCode = await generateNextCode(tx);
          const piece = await tx.jewelryPiece.create({
            data: {
              code: nextCode,
              name: data.name,
              weight: data.weight,
              karat: data.karat,
              laborCost: data.laborCost,
              marginPercent: data.marginPercent,
              calculatedPrice: data.calculatedPrice,
              profitAmount: data.profitAmount,
              marketPriceUsed: 0,
              // No market price used in direct entry
              photoUrl: data.photoUrl,
              materialId: data.materialId,
              location: data.location || "A",
              status: "AVAILABLE"
            }
          });
          await tx.auditLog.create({
            data: {
              userId: data.userId,
              action: "DIRECT_INVENTORY_ENTRY",
              entity: "JewelryPiece",
              entityId: piece.id
            }
          });
          pieces.push(piece);
        }
        return pieces;
      }
    };
  }
});

// server/index.ts
import "dotenv/config";
import { serve } from "@hono/node-server";
import { cors } from "hono/cors";

// server/dispatcher.ts
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { jwtVerify as jwtVerify2 } from "jose";

// src/lib/actions/admin-auth.ts
var admin_auth_exports = {};
__export(admin_auth_exports, {
  authorizeAction: () => authorizeAction
});
init_db();
import { compare } from "bcryptjs";
async function authorizeAction(username, pin) {
  try {
    const user = await db_default.user.findFirst({
      where: {
        name: username,
        role: { in: ["admin", "master-admin", "Administrador"] }
      }
    });
    if (!user || !user.password) {
      return { success: false, error: "Usuario no encontrado o no es administrador." };
    }
    const isValid = await compare(pin, user.password);
    if (!isValid) {
      return { success: false, error: "Contrase\xF1a incorrecta." };
    }
    return { success: true };
  } catch (error) {
    console.error(error);
    return { success: false, error: "Error de autorizaci\xF3n." };
  }
}

// src/lib/actions/app-settings.ts
var app_settings_exports = {};
__export(app_settings_exports, {
  getBusinessMode: () => getBusinessMode,
  updateBusinessMode: () => updateBusinessMode
});

// src/lib/uuid.ts
function generateUUID() {
  if (typeof window !== "undefined" && window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }
  if (typeof globalThis !== "undefined" && globalThis.crypto && typeof globalThis.crypto.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === "x" ? r : r & 3 | 8;
    return v.toString(16);
  });
}

// src/lib/actions/app-settings.ts
init_db();
async function getOrCreateSettings() {
  let settings = await db_default.systemSettings.findFirst();
  if (!settings) {
    settings = await db_default.systemSettings.create({
      data: {
        id: generateUUID(),
        updatedAt: /* @__PURE__ */ new Date()
      }
    });
  }
  return settings;
}
async function getBusinessMode() {
  const settings = await getOrCreateSettings();
  return settings.businessMode;
}
async function updateBusinessMode(mode) {
  const settings = await getOrCreateSettings();
  const updated = await db_default.systemSettings.update({
    where: { id: settings.id },
    data: { businessMode: mode, updatedAt: /* @__PURE__ */ new Date() }
  });
  return updated.businessMode;
}

// src/lib/actions/audit.ts
var audit_exports = {};
__export(audit_exports, {
  getAuditLogs: () => getAuditLogs,
  logAuditEvent: () => logAuditEvent,
  recordAudit: () => recordAudit
});
init_db();

// server/shims/next-cache.ts
function revalidatePath(_path, _type) {
}

// src/lib/actions/audit.ts
async function logAuditEvent(params) {
  return recordAudit(params);
}
async function recordAudit(params) {
  try {
    const log = await db_default.auditLog.create({
      data: {
        id: generateUUID(),
        userId: params.userId,
        userName: params.userName,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId || null,
        description: params.description,
        // Prisma AuditLog.metadata es String | Null: serializamos objetos a JSON.
        metadata: params.metadata ? typeof params.metadata === "string" ? params.metadata : JSON.stringify(params.metadata) : null,
        ipAddress: params.ipAddress ?? null
      }
    });
    revalidatePath("/settings/audit");
    return { success: true, data: log };
  } catch (error) {
    console.error("Failed to record audit log:", error);
    return { success: false, error: "Failed to record audit log" };
  }
}
async function getAuditLogs(limit = 100) {
  try {
    const logs = await db_default.auditLog.findMany({
      take: limit,
      orderBy: {
        timestamp: "desc"
      }
    });
    return { success: true, data: logs };
  } catch (error) {
    console.error("Failed to fetch audit logs:", error);
    return { success: false, error: "Failed to fetch audit logs" };
  }
}

// src/lib/actions/auth.ts
var auth_exports = {};
__export(auth_exports, {
  checkUsersExist: () => checkUsersExist,
  getSession: () => getSession,
  loginUser: () => loginUser,
  logout: () => logout,
  registerFirstUser: () => registerFirstUser,
  resetPassword: () => resetPassword
});
init_db();
import bcrypt from "bcryptjs";

// src/lib/session.ts
import { SignJWT, jwtVerify } from "jose";

// server/lib/request-context.ts
import { AsyncLocalStorage } from "node:async_hooks";
var storage = new AsyncLocalStorage();
function getRequestContext() {
  const ctx = storage.getStore();
  if (!ctx) {
    throw new Error(
      "No hay contexto de request activo. Los shims de Next solo funcionan dentro de una petici\xF3n manejada por el servidor Hono."
    );
  }
  return ctx;
}
function createCookieStore(rawCookieHeader) {
  const map = /* @__PURE__ */ new Map();
  const setCookies = [];
  if (rawCookieHeader) {
    for (const part of rawCookieHeader.split(";")) {
      const idx = part.indexOf("=");
      if (idx === -1) continue;
      const name = part.slice(0, idx).trim();
      const value = part.slice(idx + 1).trim();
      if (name) map.set(decodeURIComponent(name), decodeURIComponent(value));
    }
  }
  return {
    get(name) {
      const value = map.get(name);
      return value === void 0 ? void 0 : { name, value };
    },
    getAll() {
      return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
    },
    has(name) {
      return map.has(name);
    },
    set(name, value, opts = {}) {
      map.set(name, value);
      let cookie = `${name}=${encodeURIComponent(value)}`;
      const maxAge = opts.maxAge;
      const expires = opts.expires;
      const path = opts.path ?? "/";
      const httpOnly = opts.httpOnly;
      const secure = opts.secure;
      const sameSite = opts.sameSite;
      cookie += `; Path=${path}`;
      if (expires) cookie += `; Expires=${expires.toUTCString()}`;
      if (maxAge !== void 0 && maxAge !== null) cookie += `; Max-Age=${Math.floor(Number(maxAge))}`;
      if (httpOnly) cookie += "; HttpOnly";
      if (secure) cookie += "; Secure";
      if (sameSite) cookie += `; SameSite=${sameSite}`;
      setCookies.push(cookie);
    },
    delete(name) {
      map.delete(name);
      setCookies.push(`${name}=; Path=/; Max-Age=0`);
    },
    getSetCookies() {
      return setCookies;
    }
  };
}
function runWithContext(ctx, fn) {
  return storage.run(ctx, fn);
}

// server/shims/next-headers.ts
function cookies() {
  return getRequestContext().cookies;
}

// server/shims/react.ts
function cache(fn) {
  const cached = (...args) => {
    const key = JSON.stringify(args);
    const ctx = getRequestContext();
    if (ctx.cacheStore.has(key)) return ctx.cacheStore.get(key);
    const result = fn(...args);
    ctx.cacheStore.set(key, result);
    return result;
  };
  return cached;
}

// src/lib/session.ts
var secretKey = process.env.SESSION_SECRET;
var encodedKey = new TextEncoder().encode(secretKey || "default-secret-key-change-me");
var SESSION_DURATION_HOURS = 8;
var SESSION_DURATION_MS = SESSION_DURATION_HOURS * 60 * 60 * 1e3;
var SESSION_COOKIE_NAME = "session";
async function encrypt(payload) {
  return new SignJWT({ ...payload }).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime(`${SESSION_DURATION_HOURS}h`).sign(encodedKey);
}
async function decrypt(session = "") {
  try {
    const { payload } = await jwtVerify(session, encodedKey, {
      algorithms: ["HS256"]
    });
    return payload;
  } catch (error) {
    return null;
  }
}
async function createSession(userId, role) {
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
  const session = await encrypt({ userId, role, expiresAt });
  const cookieStore = await cookies();
  const isProd = false;
  cookieStore.set(SESSION_COOKIE_NAME, session, {
    httpOnly: true,
    secure: isProd,
    expires: expiresAt,
    maxAge: Math.floor(SESSION_DURATION_MS / 1e3),
    sameSite: "lax",
    path: "/"
  });
}
var verifySession = cache(async () => {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const session = await decrypt(cookie);
  if (!session?.userId) {
    return null;
  }
  return { isAuth: true, userId: session.userId, role: session.role };
});
async function deleteSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

// src/lib/actions/auth.ts
async function checkUsersExist() {
  try {
    const count = await db_default.user.count();
    return { exists: count > 0 };
  } catch (error) {
    console.error("Database connection error:", error);
    return { exists: false, error: "No se pudo conectar con la base de datos. Por favor, aseg\xFArese de que el servidor MySQL est\xE9 en ejecuci\xF3n." };
  }
}
async function registerFirstUser(data) {
  try {
    const userCount = await db_default.user.count();
    if (userCount > 0) {
      return { success: false, error: "Ya existen usuarios en el sistema." };
    }
    const hashedPassword = await bcrypt.hash(data.password, 10);
    await db_default.user.create({
      data: {
        id: generateUUID(),
        name: data.name,
        role: "master-admin",
        password: hashedPassword,
        status: "activo"
      }
    });
    return { success: true };
  } catch (error) {
    console.error("Error registering first user:", error);
    return { success: false, error: "Error al crear el usuario." };
  }
}
async function loginUser(name, password) {
  try {
    const user = await db_default.user.findFirst({
      where: {
        name,
        status: "activo"
      }
    });
    if (!user) {
      return { success: false, error: "Credenciales inv\xE1lidas." };
    }
    if (!user.isEnabled) {
      return { success: false, error: "Usuario bloqueado. Contacte al administrador." };
    }
    if (!user.password) {
      return { success: false, error: "Credenciales inv\xE1lidas." };
    }
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      const newFailedAttempts = (user.failedAttempts || 0) + 1;
      let errorMessage = "Credenciales inv\xE1lidas.";
      if (newFailedAttempts >= 6) {
        await db_default.user.update({
          where: { id: user.id },
          data: {
            failedAttempts: newFailedAttempts,
            isEnabled: false
          }
        });
        return { success: false, error: "Usuario bloqueado por m\xFAltiples intentos fallidos." };
      } else {
        await db_default.user.update({
          where: { id: user.id },
          data: { failedAttempts: newFailedAttempts }
        });
        errorMessage = `Credenciales inv\xE1lidas. Intento ${newFailedAttempts} de 6.`;
      }
      return { success: false, error: errorMessage };
    }
    if (user.failedAttempts > 0) {
      await db_default.user.update({
        where: { id: user.id },
        data: { failedAttempts: 0 }
      });
    }
    await createSession(user.id, user.role);
    try {
      await recordAudit({
        userId: user.id,
        userName: user.name,
        action: "LOGIN",
        entity: "Auth",
        entityId: user.id,
        description: `Inici\xF3 sesi\xF3n: ${user.name}`,
        metadata: { role: user.role }
      });
    } catch (auditError) {
      console.error("Error recording login audit:", auditError);
    }
    return {
      success: true,
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
        status: user.status,
        inventoryType: user.inventoryType,
        assignedLocation: user.assignedLocation
      }
    };
  } catch (error) {
    console.error("Login error details:", error);
    return { success: false, error: "Error al iniciar sesi\xF3n." };
  }
}
async function logout() {
  const session = await verifySession();
  await deleteSession();
  if (session?.userId) {
    try {
      const user = await db_default.user.findUnique({ where: { id: session.userId }, select: { name: true } });
      await recordAudit({
        userId: session.userId,
        userName: user?.name || "Usuario",
        action: "LOGOUT",
        entity: "Auth",
        entityId: session.userId,
        description: `Cerr\xF3 sesi\xF3n: ${user?.name || "Usuario"}`,
        metadata: {}
      });
    } catch (auditError) {
      console.error("Error recording logout audit:", auditError);
    }
  }
  return { success: true };
}
async function getSession() {
  const session = await verifySession();
  if (!session) return null;
  const user = await db_default.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      name: true,
      role: true,
      status: true,
      inventoryType: true,
      assignedLocation: true
    }
  });
  if (!user) return null;
  return {
    id: user.id,
    name: user.name,
    role: user.role,
    status: user.status,
    inventoryType: user.inventoryType,
    assignedLocation: user.assignedLocation
  };
}
async function resetPassword(username, recoveryKey, newPassword) {
  try {
    const settings = await db_default.systemSettings.findFirst();
    if (!settings || !settings.recoveryKey) {
      return { success: false, error: "La llave de recuperaci\xF3n no ha sido configurada en el sistema." };
    }
    if (settings.recoveryKey !== recoveryKey) {
      return { success: false, error: "Llave de recuperaci\xF3n incorrecta." };
    }
    const user = await db_default.user.findFirst({
      where: { name: username }
    });
    if (!user) {
      return { success: false, error: "Usuario no encontrado." };
    }
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await db_default.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        failedAttempts: 0,
        isEnabled: true
      }
    });
    return { success: true };
  } catch (error) {
    console.error("Reset password error:", error);
    return { success: false, error: "Error al restablecer la contrase\xF1a." };
  }
}

// src/lib/actions/backup.ts
var backup_exports = {};
__export(backup_exports, {
  generateBackup: () => generateBackup
});
init_db();
async function generateBackup() {
  try {
    const users = await db_default.user.findMany();
    const products = await db_default.product.findMany();
    const inventoryItems = await db_default.inventoryItem.findMany();
    const inventoryMovements = await db_default.inventoryMovement.findMany();
    const suppliers = await db_default.supplier.findMany();
    const purchaseInvoices = await db_default.purchaseInvoice.findMany();
    const cashRegisterSessions = await db_default.cashRegisterSession.findMany();
    const systemSettings = await db_default.systemSettings.findMany();
    const notifications = await db_default.notification.findMany();
    const backupData = {
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      data: {
        users,
        products,
        inventoryItems,
        inventoryMovements,
        suppliers,
        purchaseInvoices,
        cashRegisterSessions,
        systemSettings,
        notifications
      }
    };
    return { success: true, data: JSON.stringify(backupData, null, 2) };
  } catch (error) {
    console.error("Backup generation error:", error);
    return { success: false, error: "Error al generar la copia de seguridad." };
  }
}

// src/lib/actions/cash-register.ts
var cash_register_exports = {};
__export(cash_register_exports, {
  addSaleToSessionDB: () => addSaleToSessionDB,
  closeCashSession: () => closeCashSession,
  closeSession: () => closeSession,
  createOutflowAction: () => createOutflowAction,
  getSessionOutflows: () => getSessionOutflows,
  getSessionSalesBreakdown: () => getSessionSalesBreakdown,
  getSessions: () => getSessions,
  openSession: () => openSession
});
init_db();

// src/lib/actions/notifications.ts
var notifications_exports = {};
__export(notifications_exports, {
  checkUnclosedBoxes: () => checkUnclosedBoxes,
  createNotification: () => createNotification,
  getNotifications: () => getNotifications,
  markAsRead: () => markAsRead,
  notifyExpiringProduct: () => notifyExpiringProduct,
  notifyLowStock: () => notifyLowStock,
  notifyRegisterOpened: () => notifyRegisterOpened
});
init_db();
async function getNotifications(userId) {
  const whereClause = {
    read: false
    // Only fetch unread for now, or maybe last 10
  };
  if (userId) {
    whereClause.OR = [
      { userId },
      { userId: null }
      // Global notifications
    ];
  }
  const notifications = await db_default.notification.findMany({
    where: whereClause,
    orderBy: {
      createdAt: "desc"
    },
    take: 20
  });
  return notifications.map((n) => ({
    id: n.id,
    type: n.type,
    message: n.message,
    read: n.read,
    createdAt: n.createdAt,
    userId: n.userId
  }));
}
async function markAsRead(id) {
  await db_default.notification.update({
    where: { id },
    data: { read: true }
  });
}
async function createNotification(type, message, userId) {
  await db_default.notification.create({
    data: {
      id: generateUUID(),
      type,
      message,
      userId
    }
  });
}
async function notifyLowStock(productName) {
  await createNotification(
    "warning",
    `Stock bajo: El producto "${productName}" ha alcanzado el nivel m\xEDnimo de inventario.`
  );
}
async function notifyExpiringProduct(productName, date) {
  await createNotification(
    "warning",
    `Vencimiento pr\xF3ximo: El producto "${productName}" vence el ${new Date(date).toLocaleDateString()}.`
  );
}
async function notifyRegisterOpened(cashierName) {
  await createNotification(
    "info",
    `Caja abierta: El usuario ${cashierName} ha iniciado una nueva sesi\xF3n de caja.`
  );
}
async function checkUnclosedBoxes() {
  const openSessions = await db_default.cashRegisterSession.findMany({
    where: { status: "open" }
  });
  const now = /* @__PURE__ */ new Date();
  for (const session of openSessions) {
    const openingTime = new Date(session.openingTime);
    const diffHours = (now.getTime() - openingTime.getTime()) / (1e3 * 60 * 60);
    if (diffHours >= 24) {
      const message = `\u274C ALERTA: La caja de ${session.cashierName} permanece ABIERTA hace m\xE1s de 24 horas.`;
      const existing = await db_default.notification.findFirst({
        where: {
          message: { contains: `caja de ${session.cashierName} permanece ABIERTA` },
          createdAt: {
            gte: new Date((/* @__PURE__ */ new Date()).getTime() - 24 * 60 * 60 * 1e3)
            // Within the last 24h
          }
        }
      });
      if (!existing) {
        await createNotification("error", message);
      }
    }
  }
}

// src/lib/mail.ts
init_db();
import nodemailer from "nodemailer";
async function getTransporter() {
  const settings = await db_default.systemSettings.findFirst();
  if (!settings || !settings.emailNotificationsEnabled || !settings.smtpEmail || !settings.smtpPassword) {
    return null;
  }
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: settings.smtpEmail,
      pass: settings.smtpPassword
    }
  });
}
async function sendSessionOpening(sessionId) {
  try {
    const transporter = await getTransporter();
    if (!transporter) return;
    const settings = await db_default.systemSettings.findFirst();
    const session = await db_default.cashRegisterSession.findUnique({
      where: { id: sessionId },
      include: { cashier: true }
    });
    if (!session || !settings?.adminEmail) return;
    const mailOptions = {
      from: `"Sistema JoyeriaPlus" <${settings.smtpEmail}>`,
      to: settings.adminEmail,
      subject: `\u{1F514} Apertura de Caja - ${session.cashierName}`,
      html: `
                <div style="font-family: sans-serif; padding: 20px; color: #333;">
                    <h2 style="color: #2563eb;">Apertura de Caja Detectada</h2>
                    <p>Se ha iniciado una nueva sesi\xF3n de caja.</p>
                    <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
                        <tr>
                            <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Cajero:</strong></td>
                            <td style="padding: 8px; border-bottom: 1px solid #eee;">${session.cashierName}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Hora de Apertura:</strong></td>
                            <td style="padding: 8px; border-bottom: 1px solid #eee;">${new Date(session.openingTime).toLocaleString()}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Monto Inicial:</strong></td>
                            <td style="padding: 8px; border-bottom: 1px solid #eee;">C$ ${session.initialAmount.toFixed(2)}</td>
                        </tr>
                    </table>
                    <p style="margin-top: 20px; font-size: 12px; color: #666;">Este es un correo autom\xE1tico generado por JoyeriaPlus.</p>
                </div>
            `
    };
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error("Error sending session opening email:", error);
  }
}
async function sendSessionReport(sessionId) {
  try {
    const transporter = await getTransporter();
    if (!transporter) return;
    const settings = await db_default.systemSettings.findFirst();
    const session = await db_default.cashRegisterSession.findUnique({
      where: { id: sessionId },
      include: {
        cashier: true,
        salesInvoices: {
          include: { items: true }
        },
        outflows: true,
        jewelryServices: {
          orderBy: { createdAt: "asc" }
        }
      }
    });
    if (!session || !settings?.adminEmail) return;
    const totalOutflows = session.outflows.reduce((sum, o) => sum + o.amount, 0);
    let salesHtml = "";
    session.salesInvoices.forEach((inv) => {
      const itemsList = inv.items.map((item) => `${item.quantity}x ${item.productName}`).join(", ");
      salesHtml += `
                <tr>
                    <td style="padding: 8px; border-bottom: 1px solid #eee;">#${inv.invoiceNumber}</td>
                    <td style="padding: 8px; border-bottom: 1px solid #eee;">${itemsList}</td>
                    <td style="padding: 8px; border-bottom: 1px solid #eee;">${inv.paymentMethod}</td>
                    <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right; font-weight: bold;">C$ ${inv.totalAmount.toFixed(2)}</td>
                </tr>
            `;
    });
    const totalServices = (session.jewelryServices || []).reduce((sum, s) => sum + s.amount, 0);
    let servicesHtml = "";
    if (session.jewelryServices && session.jewelryServices.length > 0) {
      const servicesRows = session.jewelryServices.map((s) => `
                <tr>
                    <td style="padding: 8px; border-bottom: 1px solid #eee;">${s.description}</td>
                    <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right; font-weight: bold;">C$ ${s.amount.toFixed(2)}</td>
                </tr>
            `).join("");
      servicesHtml = `
                <h3 style="color: #1e293b; margin-top: 20px;">&#9881;&#65039; Servicios de Joyer\xEDa (${session.jewelryServices.length})</h3>
                <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr style="background-color: #f3e8ff;">
                            <th style="padding: 8px; text-align: left; border-bottom: 2px solid #c4b5fd;">Descripci\xF3n del Servicio</th>
                            <th style="padding: 8px; text-align: right; border-bottom: 2px solid #c4b5fd;">Monto (C$)</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${servicesRows}
                        <tr style="background-color: #f3e8ff; font-weight: bold;">
                            <td style="padding: 8px;">TOTAL SERVICIOS:</td>
                            <td style="padding: 8px; text-align: right;">C$ ${totalServices.toFixed(2)}</td>
                        </tr>
                    </tbody>
                </table>
            `;
    }
    const outflowsHtml = session.outflows.length > 0 ? `
            <h3 style="color: #1e293b; margin-top: 20px;">Salidas de Caja (Gastos)</h3>
            <table style="width: 100%; border-collapse: collapse;">
                <thead>
                    <tr style="background-color: #f1f5f9;">
                        <th style="padding: 8px; text-align: left; border-bottom: 2px solid #cbd5e1;">Motivo</th>
                        <th style="padding: 8px; text-align: right; border-bottom: 2px solid #cbd5e1;">Monto</th>
                    </tr>
                </thead>
                <tbody>
                    ${session.outflows.map((o) => `
                        <tr>
                            <td style="padding: 8px; border-bottom: 1px solid #eee;">${o.reason}</td>
                            <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">C$ ${o.amount.toFixed(2)}</td>
                        </tr>
                    `).join("")}
                </tbody>
            </table>
        ` : "";
    const mailOptions = {
      from: `"Sistema JoyeriaPlus" <${settings.smtpEmail}>`,
      to: settings.adminEmail,
      subject: `\u{1F4DD} Cierre de Caja Detallado - ${session.cashierName}`,
      html: `
                <div style="font-family: sans-serif; padding: 20px; color: #333;">
                    <h2 style="color: #2563eb;">Reporte de Cierre de Caja</h2>
                    <p>Resumen detallado del turno de <strong>${session.cashierName}</strong>.</p>
                    
                    <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                        <h3 style="margin-top: 0; color: #1e293b;">Resumen de Sesi\xF3n</h3>
                        <table style="width: 100%;">
                            <tr><td><strong>Apertura:</strong></td><td>${new Date(session.openingTime).toLocaleString()}</td></tr>
                            <tr><td><strong>Cierre:</strong></td><td>${session.closingTime ? new Date(session.closingTime).toLocaleString() : "N/A"}</td></tr>
                            <tr><td><strong>Monto Inicial:</strong></td><td>C$ ${session.initialAmount.toFixed(2)}</td></tr>
                            <tr><td><strong>Ventas Totales:</strong></td><td>C$ ${(session.totalSales || 0).toFixed(2)}</td></tr>
                            ${totalServices > 0 ? `<tr><td style="padding-left:16px;color:#7c3aed;"><strong>\u2192 incl. Servicios:</strong></td><td style="color:#7c3aed;">C$ ${totalServices.toFixed(2)}</td></tr>` : ""}
                            <tr><td><strong>Salidas (Gastos):</strong></td><td>C$ ${totalOutflows.toFixed(2)}</td></tr>
                            <tr style="font-size: 1.1em; color: #1e40af;"><td><strong>Efectivo Esperado:</strong></td><td>C$ ${(session.finalAmount || 0).toFixed(2)}</td></tr>
                            <tr style="font-size: 1.1em; color: #1e40af;"><td><strong>Efectivo Real:</strong></td><td>C$ ${(session.actualCash || 0).toFixed(2)}</td></tr>
                            <tr style="font-weight: bold; color: ${(session.difference || 0) < 0 ? "#dc2626" : "#16a34a"};">
                                <td><strong>Diferencia:</strong></td><td>C$ ${(session.difference || 0).toFixed(2)}</td>
                            </tr>
                        </table>
                    </div>

                    <h3 style="color: #1e293b;">Detalle de Ventas</h3>
                    <table style="width: 100%; border-collapse: collapse;">
                        <thead>
                            <tr style="background-color: #f1f5f9;">
                                <th style="padding: 8px; text-align: left; border-bottom: 2px solid #cbd5e1;">Factura</th>
                                <th style="padding: 8px; text-align: left; border-bottom: 2px solid #cbd5e1;">Productos</th>
                                <th style="padding: 8px; text-align: left; border-bottom: 2px solid #cbd5e1;">Pago</th>
                                <th style="padding: 8px; text-align: right; border-bottom: 2px solid #cbd5e1;">Total (C$)</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${salesHtml || '<tr><td colspan="4" style="text-align: center; padding: 10px;">No hubo ventas en este turno.</td></tr>'}
                        </tbody>
                    </table>

                    ${servicesHtml}
                    ${outflowsHtml}

                    <p style="margin-top: 30px; font-size: 12px; color: #666; text-align: center;">
                        Reporte generado autom\xE1ticamente por JoyeriaPlus v2.0
                    </p>
                </div>
            `
    };
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error("Error sending session report email:", error);
  }
}
async function sendActivationNotification(licenseKey, businessName, licenseType = "Desconocida") {
  try {
    const settings = await db_default.systemSettings.findFirst();
    let user = settings?.smtpEmail || "carboo12@gmail.com";
    let pass = settings?.smtpPassword || "labg afco vyui dubo";
    if (!settings?.smtpEmail || !settings?.smtpPassword) {
      user = "carboo12@gmail.com";
      pass = "labg afco vyui dubo";
    }
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user, pass }
    });
    const mailOptions = {
      from: `"JoyeriaPlus Sentinel" <${user}>`,
      to: "carboo12@gmail.com",
      subject: `\u{1F680} Nueva Activaci\xF3n/Renovaci\xF3n: ${businessName}`,
      html: `
                <div style="font-family: sans-serif; padding: 20px; color: #333; border: 2px solid #673AB7; border-radius: 10px;">
                    <h2 style="color: #673AB7;">Alerta de Licencia JoyeriaPlus</h2>
                    <p>Se ha procesado una activaci\xF3n o renovaci\xF3n en el sistema.</p>
                    <hr style="border: 1px solid #eee;" />
                    <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
                        <tr>
                            <td style="padding: 8px;"><strong>Negocio:</strong></td>
                            <td style="padding: 8px;">${businessName}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px;"><strong>Tipo de Licencia:</strong></td>
                            <td style="padding: 8px;"><span style="background: #e9d5ff; color: #6b21a8; padding: 4px 8px; border-radius: 4px; font-weight: bold;">${licenseType}</span></td>
                        </tr>
                        <tr>
                            <td style="padding: 8px;"><strong>C\xF3digo/ID:</strong></td>
                            <td style="padding: 8px; font-family: monospace; background: #f4f4f4;">${licenseKey}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px;"><strong>Fecha:</strong></td>
                            <td style="padding: 8px;">${(/* @__PURE__ */ new Date()).toLocaleString()}</td>
                        </tr>
                    </table>
                    <p style="margin-top: 20px; font-size: 11px; color: #999;">Notificaci\xF3n autom\xE1tica de seguridad.</p>
                </div>
            `
    };
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error("Error sending activation notification:", error);
  }
}

// src/lib/payment-method.ts
var normalize = (value) => (value || "").toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
var getPaymentBucket = (paymentMethod) => {
  const m = normalize(paymentMethod);
  const isUsd = /USD|DOLAR/.test(m) || m.includes("$") && !m.includes("C$");
  if (isUsd) return "usd";
  if (/CASH|EFECTIVO|CONTADO/.test(m)) return "cash";
  if (/CARD|TARJETA|TRANSF|PAGO MOVIL|SINPE/.test(m)) return "card";
  if (/CREDIT|FIADO/.test(m)) return "credit";
  return "other";
};
var isCreditPayment = (paymentMethod) => getPaymentBucket(paymentMethod) === "credit";

// src/lib/actions/cash-register.ts
async function computeSessionBreakdown(client, sessionId) {
  const [invoices, servicesAgg, sessionRow] = await Promise.all([
    client.salesInvoice.findMany({
      where: {
        sessionId,
        status: { notIn: ["PENDING", "CANCELLED", "VOID", "HELD"] }
      },
      select: { totalAmount: true, paymentMethod: true }
    }),
    client.jewelryService.aggregate({
      where: { sessionId },
      _sum: { amount: true }
    }),
    client.cashRegisterSession.findUnique({
      where: { id: sessionId },
      select: { totalReturns: true, salesAbonos: true }
    })
  ]);
  const round2 = (n) => Math.round(n * 100) / 100;
  let invoiceTotal = 0;
  let salesCash = 0;
  let salesCard = 0;
  let salesUSD = 0;
  let salesCredit = 0;
  for (const inv of invoices) {
    const amount = Number(inv.totalAmount) || 0;
    invoiceTotal += amount;
    switch (getPaymentBucket(inv.paymentMethod || "")) {
      case "cash":
        salesCash += amount;
        break;
      case "card":
        salesCard += amount;
        break;
      case "usd":
        salesUSD += amount;
        break;
      case "credit":
        salesCredit += amount;
        break;
      default:
        break;
    }
  }
  const salesServices = Number(servicesAgg._sum.amount) || 0;
  return {
    totalSales: round2(invoiceTotal + salesServices),
    salesCash: round2(salesCash + salesServices),
    salesCard: round2(salesCard),
    salesUSD: round2(salesUSD),
    salesCredit: round2(salesCredit),
    salesServices: round2(salesServices),
    salesAbonos: Number(sessionRow?.salesAbonos) || 0,
    totalReturns: Number(sessionRow?.totalReturns) || 0
  };
}
async function getSessionSalesBreakdown(sessionId) {
  return computeSessionBreakdown(db_default, sessionId);
}
async function getSessions() {
  const sessions = await db_default.cashRegisterSession.findMany({
    orderBy: {
      openingTime: "desc"
    },
    include: {
      user: true
    }
  });
  return sessions.map((s) => {
    const row = s;
    return {
      id: row.id,
      cashierId: row.cashierId,
      cashierName: row.cashierName,
      openingTime: row.openingTime,
      closingTime: row.closingTime,
      initialAmount: row.initialAmount,
      initialAmountUSD: row.initialAmountUSD || 0,
      finalAmount: row.finalAmount,
      totalSales: row.totalSales,
      salesCash: row.salesCash,
      salesCard: row.salesCard,
      salesUSD: row.salesUSD,
      salesServices: row.salesServices ?? 0,
      salesCredit: row.salesCredit ?? 0,
      salesAbonos: row.salesAbonos ?? 0,
      totalReturns: row.totalReturns,
      actualCash: row.actualCash,
      actualUSD: row.actualUSD ?? 0,
      difference: row.difference,
      differenceUSD: row.differenceUSD ?? 0,
      status: row.status
    };
  });
}
async function openSession(cashierId, cashierName, initialAmount, initialAmountUSD = 0) {
  const existing = await db_default.cashRegisterSession.findFirst({
    where: {
      cashierId,
      status: "open"
    }
  });
  if (existing) {
    throw new Error("User already has an open session");
  }
  const session = await db_default.cashRegisterSession.create({
    data: {
      id: generateUUID(),
      cashierId,
      cashierName,
      openingTime: (/* @__PURE__ */ new Date()).toISOString(),
      initialAmount,
      initialAmountUSD,
      status: "open",
      totalSales: 0
    }
  });
  await notifyRegisterOpened(cashierName);
  sendSessionOpening(session.id);
  revalidatePath("/");
  return session;
}
async function closeCashSession(sessionId, payload = {}) {
  const actualCash = Number(payload?.actualCash) || 0;
  const actualUSD = Number(payload?.actualUSD) || 0;
  const round2 = (n) => Math.round(n * 100) / 100;
  const result = await db_default.$transaction(async (tx) => {
    const session = await tx.cashRegisterSession.findUnique({ where: { id: sessionId } });
    if (!session) throw new Error("Session not found");
    const breakdown = await computeSessionBreakdown(tx, sessionId);
    const outflowsAgg = await tx.cashOutflow.aggregate({
      where: { sessionId },
      _sum: { amount: true }
    });
    const totalOutflows = Number(outflowsAgg._sum.amount) || 0;
    const expectedCash = round2((session.initialAmount || 0) + breakdown.salesCash + breakdown.salesAbonos - totalOutflows - breakdown.totalReturns);
    const expectedUSD = round2((session.initialAmountUSD || 0) + breakdown.salesUSD);
    const finalAmount = expectedCash;
    const difference = round2(actualCash - expectedCash);
    const differenceUSD = round2(actualUSD - expectedUSD);
    const closingTime = (/* @__PURE__ */ new Date()).toISOString();
    const updated = await tx.cashRegisterSession.update({
      where: { id: sessionId },
      data: {
        status: "closed",
        closingTime,
        finalAmount,
        actualCash,
        actualUSD,
        difference,
        differenceUSD,
        totalSales: breakdown.totalSales,
        salesCash: breakdown.salesCash,
        salesCard: breakdown.salesCard,
        salesUSD: breakdown.salesUSD,
        salesCredit: breakdown.salesCredit,
        salesServices: breakdown.salesServices,
        salesAbonos: breakdown.salesAbonos
      }
    });
    const report = {
      openingBalance: session.initialAmount || 0,
      initialAmount: session.initialAmount || 0,
      initialAmountUSD: session.initialAmountUSD || 0,
      closingTime,
      expectedCash,
      expectedUSD,
      finalAmount,
      actualCash,
      actualUSD,
      difference,
      differenceUSD,
      totalSales: breakdown.totalSales,
      salesCash: breakdown.salesCash,
      salesCard: breakdown.salesCard,
      salesUSD: breakdown.salesUSD,
      salesCredit: breakdown.salesCredit,
      salesServices: breakdown.salesServices,
      salesAbonos: breakdown.salesAbonos,
      totalReturns: breakdown.totalReturns,
      totalOutflows
    };
    return { session: updated, breakdown, report, cashierName: session.cashierName };
  });
  try {
    await createNotification("info", `Caja cerrada por ${result.cashierName}. Total Ventas: C$${result.breakdown.totalSales}. Diferencia: C$${result.report.difference}`);
  } catch (e) {
    console.error("Error creando notificaci\xF3n de cierre:", e);
  }
  sendSessionReport(sessionId).catch(() => {
  });
  revalidatePath("/");
  return { success: true, session: result.session, breakdown: result.breakdown, report: result.report };
}
async function closeSession(sessionId, finalAmount, actualCash, actualUSD = 0) {
  return closeCashSession(sessionId, { actualCash, actualUSD });
}
async function addSaleToSessionDB(sessionId, amount) {
  const session = await db_default.cashRegisterSession.findUnique({
    where: { id: sessionId }
  });
  if (!session) throw new Error("Session not found");
  await db_default.cashRegisterSession.update({
    where: { id: sessionId },
    data: {
      totalSales: (session.totalSales || 0) + amount
    }
  });
  revalidatePath("/");
}
async function createOutflowAction(sessionId, amount, reason) {
  const session = await db_default.cashRegisterSession.findUnique({
    where: { id: sessionId }
  });
  if (!session) throw new Error("Session not found");
  if (session.status !== "open") throw new Error("Session is closed");
  const outflow = await db_default.cashOutflow.create({
    data: {
      id: generateUUID(),
      sessionId,
      amount,
      reason
    }
  });
  revalidatePath("/");
  return outflow;
}
async function getSessionOutflows(sessionId) {
  return db_default.cashOutflow.findMany({
    where: { sessionId },
    orderBy: { createdAt: "desc" }
  });
}

// src/lib/actions/categories.ts
var categories_exports = {};
__export(categories_exports, {
  createCategory: () => createCategory,
  deleteCategory: () => deleteCategory,
  getCategories: () => getCategories,
  getCategoryTree: () => getCategoryTree,
  updateCategory: () => updateCategory
});
init_db();
async function getCategories(inventoryType) {
  const session = await verifySession();
  if (!session) {
    return { success: false, error: "No autorizado" };
  }
  try {
    const where = inventoryType ? { inventoryType } : {};
    const allCategories = await db_default.category.findMany({
      where,
      include: {
        category: true,
        _count: { select: { product: true, other_category: true } }
      },
      orderBy: { name: "asc" }
    });
    return { success: true, data: allCategories };
  } catch (error) {
    console.error("Error fetching categories:", error);
    return { success: false, error: "Error al obtener categor\xEDas" };
  }
}
async function getCategoryTree() {
  try {
    const allCategories = await db_default.category.findMany({
      include: {
        _count: { select: { product: true } }
      },
      orderBy: { name: "asc" }
    });
    const buildTree = (categories, parentId = null) => {
      return categories.filter((cat) => cat.parentId === parentId).map((cat) => ({
        ...cat,
        children: buildTree(categories, cat.id)
      }));
    };
    const tree = buildTree(allCategories);
    return { success: true, data: tree };
  } catch (error) {
    console.error("Error fetching category tree:", error);
    return { success: false, error: "Failed to fetch category tree" };
  }
}
async function createCategory(data) {
  const session = await verifySession();
  if (!session || session.role !== "master-admin" && session.role !== "admin") {
    return { success: false, error: "No autorizado" };
  }
  if (!data.name || data.name.trim() === "") {
    return { success: false, error: "El nombre es requerido" };
  }
  try {
    const existing = await db_default.category.findFirst({
      where: {
        name: data.name,
        inventoryType: data.inventoryType
      }
    });
    if (existing) {
      return { success: false, error: "Ya existe una categor\xEDa con ese nombre en este cat\xE1logo" };
    }
    if (data.parentId) {
      const parentExists = await db_default.category.findUnique({
        where: { id: data.parentId }
      });
      if (!parentExists) {
        return { success: false, error: "La categor\xEDa padre seleccionada no existe" };
      }
    }
    const category = await db_default.category.create({
      data: {
        ...data,
        id: generateUUID(),
        updatedAt: /* @__PURE__ */ new Date()
      }
    });
    revalidatePath("/categories");
    return { success: true, data: category };
  } catch (error) {
    console.error("Error creating category:", error);
    return { success: false, error: "Error al crear categor\xEDa" };
  }
}
async function updateCategory(id, data) {
  const session = await verifySession();
  if (!session || session.role !== "master-admin" && session.role !== "admin") {
    return { success: false, error: "No autorizado" };
  }
  if (data.parentId === id) {
    return { success: false, error: "Una categor\xEDa no puede ser su propio padre" };
  }
  try {
    if (data.parentId) {
      const parentExists = await db_default.category.findUnique({
        where: { id: data.parentId }
      });
      if (!parentExists) {
        return { success: false, error: "La categor\xEDa padre seleccionada no existe" };
      }
    }
    const category = await db_default.category.update({
      where: { id },
      data
    });
    revalidatePath("/categories");
    return { success: true, data: category };
  } catch (error) {
    console.error("Error updating category:", error);
    return { success: false, error: "Error al actualizar categor\xEDa" };
  }
}
async function deleteCategory(id) {
  const session = await verifySession();
  if (!session || session.role !== "master-admin" && session.role !== "admin") {
    return { success: false, error: "No autorizado" };
  }
  try {
    const category = await db_default.category.findUnique({
      where: { id },
      include: {
        _count: {
          select: { product: true, other_category: true }
        }
      }
    });
    if (!category) {
      return { success: false, error: "Categor\xEDa no encontrada" };
    }
    if (category._count.other_category > 0) {
      return { success: false, error: `No se puede eliminar. Esta categor\xEDa tiene ${category._count.other_category} subcategor\xEDa(s)` };
    }
    if (category._count.product > 0) {
      return { success: false, error: `No se puede eliminar. Hay ${category._count.product} producto(s) asignado(s)` };
    }
    await db_default.category.delete({
      where: { id }
    });
    revalidatePath("/categories");
    return { success: true };
  } catch (error) {
    console.error("Error deleting category:", error);
    return { success: false, error: "Error al eliminar categor\xEDa" };
  }
}

// src/lib/actions/check-expirations.ts
var check_expirations_exports = {};
__export(check_expirations_exports, {
  checkAndNotifyExpirations: () => checkAndNotifyExpirations
});
init_db();
async function checkAndNotifyExpirations() {
  try {
    const today = /* @__PURE__ */ new Date();
    const futureDate = /* @__PURE__ */ new Date();
    futureDate.setDate(today.getDate() + 30);
    const expiringItems = await db_default.inventoryItem.findMany({
      where: {
        expiryDate: {
          lte: futureDate.toISOString(),
          gte: today.toISOString()
        },
        quantity: {
          gt: 0
        }
      }
    });
    let notificationsSent = 0;
    for (const item of expiringItems) {
      const message = `Vencimiento pr\xF3ximo: El producto "${item.productName}" vence el ${new Date(item.expiryDate).toLocaleDateString()}.`;
      const existingNotification = await db_default.notification.findFirst({
        where: {
          message,
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1e3)
            // Last 24 hours
          }
        }
      });
      if (!existingNotification) {
        await notifyExpiringProduct(item.productName, item.expiryDate);
        notificationsSent++;
      }
    }
    return { success: true, count: notificationsSent };
  } catch (error) {
    console.error("Error checking expirations:", error);
    return { success: false, error: "Failed to check expirations" };
  }
}

// src/lib/actions/collections.ts
var collections_exports = {};
__export(collections_exports, {
  getCollections: () => getCollections,
  registerPayment: () => registerPayment
});
init_db();

// src/lib/business-guard.ts
init_db();
var BusinessGuard = class {
  /**
   * Obtiene el modo de negocio actual desde la base de datos de manera síncrona/segura
   * para funciones backend.
   */
  static async getCurrentMode() {
    const settings = await db_default.systemSettings.findFirst();
    return settings?.businessMode ?? "PHARMACY";
  }
  /**
   * Verifica que la aplicación esté en el modo de negocio esperado.
   * Lanza un error si no coincide (útil para proteger rutas API).
   */
  static async assertMode(expectedMode) {
    const currentMode = await this.getCurrentMode();
    if (currentMode !== expectedMode) {
      throw new Error(`Business Rule Violation: Expected mode ${expectedMode}, but current mode is ${currentMode}`);
    }
  }
  static async isJewelryMode() {
    return await this.getCurrentMode() === "JEWELRY";
  }
  static async isPharmacyMode() {
    return await this.getCurrentMode() === "PHARMACY";
  }
  static async isBoutiqueMode() {
    return await this.getCurrentMode() === "BOUTIQUE";
  }
  static async isDistribuidoraMode() {
    return await this.getCurrentMode() === "DISTRIBUIDORA";
  }
};

// src/lib/actions/collections.ts
async function getCollections() {
  const session = await verifySession();
  if (!session) return { success: false, error: "Unauthorized" };
  await BusinessGuard.assertMode("DISTRIBUIDORA");
  try {
    const payments = await db_default.collectionPayment.findMany({
      orderBy: { receivedAt: "desc" },
      include: {
        order: {
          include: { customer: { select: { fullName: true } } }
        },
        user: { select: { name: true } }
      }
    });
    return { success: true, data: payments };
  } catch (error) {
    console.error("Error fetching collections:", error);
    return { success: false, error: "Failed to fetch collections" };
  }
}
async function registerPayment(data) {
  const session = await verifySession();
  if (!session) return { success: false, error: "Unauthorized" };
  await BusinessGuard.assertMode("DISTRIBUIDORA");
  try {
    const payment = await db_default.collectionPayment.create({
      data: {
        id: generateUUID(),
        orderId: data.orderId,
        amount: data.amount,
        paymentMethod: data.paymentMethod,
        userId: session.userId,
        notes: data.notes
      }
    });
    const order = await db_default.customerOrder.findUnique({ where: { id: data.orderId } });
    if (order) {
      const newPaid = order.paidAmount + data.amount;
      const newStatus = newPaid >= order.totalAmount ? "DELIVERED" : order.status;
      await db_default.customerOrder.update({
        where: { id: data.orderId },
        data: { paidAmount: newPaid, status: newStatus }
      });
    }
    revalidatePath("/collections");
    revalidatePath(`/orders/${data.orderId}`);
    return { success: true, data: payment };
  } catch (error) {
    console.error("Error registering payment:", error);
    return { success: false, error: "Failed to register payment" };
  }
}

// src/lib/actions/credit-notes.ts
var credit_notes_exports = {};
__export(credit_notes_exports, {
  createCreditNote: () => createCreditNote,
  getInvoiceByNumber: () => getInvoiceByNumber
});
init_db();
async function getInvoiceByNumber(invoiceNumber) {
  const session = await verifySession();
  if (!session) return { success: false, error: "Unauthorized" };
  try {
    let parsed;
    if (typeof invoiceNumber === "string") {
      const cleaned = invoiceNumber.replace(/^0+/, "");
      parsed = cleaned === "" ? 1 : parseInt(cleaned, 10);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        return { success: false, error: "N\xFAmero de factura inv\xE1lido" };
      }
    } else {
      parsed = invoiceNumber;
    }
    const invoice = await db_default.salesInvoice.findUnique({
      where: { invoiceNumber: parsed },
      include: {
        salesInvoiceItem: true,
        creditNote: true
        // Check if already refunded
      }
    });
    if (!invoice) {
      return { success: false, error: "Factura no encontrada" };
    }
    if (invoice.creditNote) {
      return { success: false, error: "Esta factura ya tiene una nota de cr\xE9dito asociada" };
    }
    return { success: true, invoice };
  } catch (error) {
    console.error("Error fetching invoice:", error);
    return { success: false, error: "Error al buscar la factura" };
  }
}
async function createCreditNote(invoiceId, reason, itemsToReturn, sessionId) {
  const session = await verifySession();
  if (!session) return { success: false, error: "Unauthorized" };
  try {
    return await db_default.$transaction(async (tx) => {
      const invoice = await tx.salesInvoice.findUnique({
        where: { id: invoiceId },
        include: { salesInvoiceItem: true }
      });
      if (!invoice) throw new Error("Factura no encontrada");
      let refundAmount = 0;
      for (const itemReturn of itemsToReturn) {
        const originalItem = invoice.salesInvoiceItem.find((i) => i.productId === itemReturn.productId);
        if (!originalItem) throw new Error(`Producto no encontrado en factura original: ${itemReturn.productId}`);
        if (itemReturn.quantity > originalItem.quantity) throw new Error(`Cantidad a devolver excede la cantidad original para el producto: ${originalItem.productName}`);
        refundAmount += originalItem.unitPrice * itemReturn.quantity;
      }
      const creditNote = await tx.creditNote.create({
        data: {
          id: generateUUID(),
          invoiceId: invoice.id,
          reason,
          totalAmount: refundAmount,
          sessionId,
          userId: session.userId
        }
      });
      await tx.salesInvoice.update({
        where: { id: invoice.id },
        data: { status: "REFUNDED" }
        // Or PARTIALLY_REFUNDED if we support that later
      });
      for (const itemReturn of itemsToReturn) {
        const inventoryItem = await tx.inventoryItem.findFirst({
          where: { productId: itemReturn.productId }
        });
        if (inventoryItem) {
          await tx.inventoryItem.update({
            where: { id: inventoryItem.id },
            data: { quantity: { increment: itemReturn.quantity } }
          });
          const currentStockRecords = await tx.inventoryItem.findMany({
            where: { productId: itemReturn.productId, inventoryType: inventoryItem.inventoryType }
          });
          const currentTotal = currentStockRecords.reduce((sum, i) => sum + i.quantity, 0);
          const previousTotal = currentTotal - itemReturn.quantity;
          await tx.inventoryMovement.create({
            data: {
              id: generateUUID(),
              timestamp: (/* @__PURE__ */ new Date()).toISOString(),
              productName: invoice.salesInvoiceItem.find((i) => i.productId === itemReturn.productId)?.productName || "Unknown",
              movementType: "Devoluci\xF3n",
              movementId: invoice.invoiceNumber.toString(),
              quantityChange: itemReturn.quantity,
              previousQuantity: previousTotal,
              newQuantity: currentTotal,
              userId: session.userId,
              inventoryType: inventoryItem.inventoryType
            }
          });
        }
      }
      await tx.cashRegisterSession.update({
        where: { id: sessionId },
        data: {
          totalReturns: { increment: refundAmount }
        }
      });
      return { success: true, creditNote };
    });
  } catch (error) {
    console.error("Error creating credit note:", error);
    return { success: false, error: "Error al procesar la nota de cr\xE9dito" };
  }
}

// src/lib/actions/csv-sync.ts
var csv_sync_exports = {};
__export(csv_sync_exports, {
  analyzeStoreCsv: () => analyzeStoreCsv,
  applyStoreSyncToLocalInventory: () => applyStoreSyncToLocalInventory,
  exportJewelryInventoryCSV: () => exportJewelryInventoryCSV,
  exportJewelrySalesCSV: () => exportJewelrySalesCSV,
  importJewelryInventoryCSV: () => importJewelryInventoryCSV,
  importJewelrySalesCSV: () => importJewelrySalesCSV
});
init_db();
function escapeCsvValue(val) {
  if (val === null || val === void 0) return "";
  const str = String(val);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}
function parseCsvLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}
async function exportJewelryInventoryCSV(location) {
  try {
    const where = {};
    if (location && location !== "ALL") {
      where.location = location;
    }
    const pieces = await db_default.jewelryPiece.findMany({
      where,
      orderBy: { createdAt: "desc" }
    });
    const headers = ["Id", "Code", "Name", "Weight", "Karat", "LaborCost", "MarginPercent", "CalculatedPrice", "ProfitAmount", "MarketPriceUsed", "Status", "PhotoUrl"];
    const rows = pieces.map((p) => [
      p.id,
      p.code || "",
      p.name,
      p.weight,
      p.karat,
      p.laborCost,
      p.marginPercent,
      p.calculatedPrice,
      p.profitAmount,
      p.marketPriceUsed,
      p.status,
      p.photoUrl || ""
    ]);
    const csvString = [
      headers.join(","),
      ...rows.map((r) => r.map(escapeCsvValue).join(","))
    ].join("\n");
    return { success: true, data: csvString };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
async function importJewelryInventoryCSV(formData) {
  try {
    const file = formData.get("file");
    if (!file) throw new Error("No se proporcion\xF3 ning\xFAn archivo");
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
    if (lines.length < 2) throw new Error("El archivo CSV no tiene datos suficientes.");
    const headers = parseCsvLine(lines[0]).map((h) => h.trim());
    const expectedHeaders = ["Id", "Code", "Name", "Weight", "Karat", "LaborCost", "MarginPercent", "CalculatedPrice", "ProfitAmount", "MarketPriceUsed", "Status", "PhotoUrl"];
    if (headers[0] !== "Id" || headers[2] !== "Name") {
      throw new Error("Formato de CSV no reconocido. Se esperaba Id, Code, Name...");
    }
    let updated = 0;
    let created = 0;
    for (let i = 1; i < lines.length; i++) {
      const values = parseCsvLine(lines[i]);
      const data = {
        id: values[0] || void 0,
        // If empty, prisma won't let upsert without ID, so we handle it below
        code: values[1] || null,
        name: values[2],
        weight: parseFloat(values[3] || "0"),
        karat: parseInt(values[4] || "0"),
        laborCost: parseFloat(values[5] || "0"),
        marginPercent: parseFloat(values[6] || "0"),
        calculatedPrice: parseFloat(values[7] || "0"),
        profitAmount: parseFloat(values[8] || "0"),
        marketPriceUsed: parseFloat(values[9] || "0"),
        status: values[10] || "AVAILABLE",
        photoUrl: values[11] || null
      };
      if (!data.name || isNaN(data.weight)) continue;
      if (data.id) {
        const existing = await db_default.jewelryPiece.findUnique({ where: { id: data.id } });
        if (existing) {
          await db_default.jewelryPiece.update({ where: { id: data.id }, data });
          updated++;
        } else {
          await db_default.jewelryPiece.create({ data: { ...data, id: data.id } });
          created++;
        }
      } else {
        await db_default.jewelryPiece.create({ data });
        created++;
      }
    }
    revalidatePath("/jewelry/inventory");
    revalidatePath("/jewelry/sync");
    return { success: true, message: `Importaci\xF3n completada: ${created} creados, ${updated} actualizados.` };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
async function exportJewelrySalesCSV(location) {
  try {
    const where = { status: "SOLD" };
    if (location && location !== "ALL") {
      where.location = location;
    }
    const soldPieces = await db_default.jewelryPiece.findMany({
      where
    });
    const headers = ["PieceId", "DateExported", "Code", "Name", "SalePrice"];
    const rows = soldPieces.map((p) => [
      p.id,
      (/* @__PURE__ */ new Date()).toISOString(),
      p.code || "",
      p.name,
      p.calculatedPrice
      // Precio aprox de venta si no queremos rastrear la factura exacta en este CSV simple
    ]);
    const csvString = [
      headers.join(","),
      ...rows.map((r) => r.map(escapeCsvValue).join(","))
    ].join("\n");
    return { success: true, data: csvString };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
async function importJewelrySalesCSV(formData, userId) {
  try {
    const file = formData.get("file");
    if (!file) throw new Error("No se proporcion\xF3 ning\xFAn archivo");
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
    if (lines.length < 2) throw new Error("El archivo CSV no tiene datos suficientes.");
    let soldCount = 0;
    for (let i = 1; i < lines.length; i++) {
      const values = parseCsvLine(lines[i]);
      const pieceId = values[0];
      const pieceName = values[3];
      if (!pieceId) continue;
      const existing = await db_default.jewelryPiece.findUnique({ where: { id: pieceId } });
      if (existing && existing.status !== "SOLD") {
        await db_default.jewelryPiece.update({
          where: { id: pieceId },
          data: { status: "SOLD" }
        });
        await db_default.auditLog.create({
          data: {
            userId,
            action: "JEWELRY_SALE_SYNC",
            entity: "JewelryPiece",
            entityId: pieceId
          }
        });
        soldCount++;
      }
    }
    revalidatePath("/jewelry/inventory");
    revalidatePath("/jewelry/sync");
    if (soldCount > 0) {
      await createNotification(
        "success",
        `Sincronizaci\xF3n de ventas completada: ${soldCount} piezas marcadas como vendidas en el sistema central.`
      );
    }
    return { success: true, message: `Sincronizaci\xF3n completada: ${soldCount} piezas marcadas como vendidas en casa.` };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
async function analyzeStoreCsv(csvText) {
  try {
    const lines = csvText.split(/\r?\n/).filter((line) => line.trim().length > 0);
    if (lines.length < 2) throw new Error("El archivo CSV no tiene datos suficientes.");
    const headers = parseCsvLine(lines[0]).map((h) => h.trim());
    const isSalesFormat = headers[0] === "PieceId" || headers[0] === "PieceId";
    const isInventoryFormat = headers.includes("Status") || headers.includes("Code");
    const csvSoldCodes = /* @__PURE__ */ new Set();
    const csvSoldIds = /* @__PURE__ */ new Set();
    for (let i = 1; i < lines.length; i++) {
      const values = parseCsvLine(lines[i]);
      if (isSalesFormat && headers[0] === "PieceId") {
        const pieceId = values[0]?.trim();
        const code = values[2]?.trim();
        if (pieceId) csvSoldIds.add(pieceId);
        if (code) csvSoldCodes.add(code);
      } else {
        const codeIdx = headers.indexOf("Code");
        const statusIdx = headers.indexOf("Status");
        const idIdx = headers.indexOf("Id") !== -1 ? headers.indexOf("Id") : headers.indexOf("ID");
        const status = statusIdx !== -1 ? values[statusIdx]?.trim() : "";
        const code = codeIdx !== -1 ? values[codeIdx]?.trim() : "";
        const id = idIdx !== -1 ? values[idIdx]?.trim() : "";
        if (status === "SOLD") {
          if (code) csvSoldCodes.add(code);
          if (id) csvSoldIds.add(id);
        }
      }
    }
    if (csvSoldCodes.size === 0 && csvSoldIds.size === 0) {
      return {
        success: true,
        soldAtStore: [],
        message: "No se encontraron joyas vendidas en el CSV de la tienda."
      };
    }
    const localPieces = await db_default.jewelryPiece.findMany({
      where: {
        status: "AVAILABLE"
      }
    });
    const soldAtStore = localPieces.filter((p) => {
      const matchByCode = p.code && csvSoldCodes.has(p.code);
      const matchById = csvSoldIds.has(p.id);
      return matchByCode || matchById;
    });
    return {
      success: true,
      soldAtStore: soldAtStore.map((p) => ({
        id: p.id,
        code: p.code,
        name: p.name,
        karat: p.karat,
        weight: p.weight,
        calculatedPrice: p.calculatedPrice,
        location: p.location
      })),
      message: `Se encontraron ${soldAtStore.length} piezas vendidas en la tienda que a\xFAn aparecen disponibles en casa.`
    };
  } catch (error) {
    return { success: false, error: error.message, soldAtStore: [] };
  }
}
async function applyStoreSyncToLocalInventory(pieceIds, userId) {
  try {
    if (!pieceIds || pieceIds.length === 0) {
      return { success: false, error: "No hay piezas para sincronizar." };
    }
    let updatedCount = 0;
    for (const pieceId of pieceIds) {
      const piece = await db_default.jewelryPiece.findUnique({ where: { id: pieceId } });
      if (piece && piece.status !== "SOLD") {
        await db_default.jewelryPiece.update({
          where: { id: pieceId },
          data: { status: "SOLD" }
        });
        await db_default.auditLog.create({
          data: {
            userId,
            action: "STORE_SYNC_SOLD",
            entity: "JewelryPiece",
            entityId: pieceId
          }
        });
        updatedCount++;
      }
    }
    revalidatePath("/jewelry/inventory");
    revalidatePath("/jewelry/sync");
    return {
      success: true,
      updatedCount,
      message: `\u2705 Inventario actualizado: ${updatedCount} piezas marcadas como vendidas en el local.`
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// src/lib/actions/customers.ts
var customers_exports = {};
__export(customers_exports, {
  createOrUpdateCustomer: () => createOrUpdateCustomer,
  deleteCustomer: () => deleteCustomer,
  getAllCustomers: () => getAllCustomers,
  getCustomerByFullName: () => getCustomerByFullName,
  getCustomerStatement: () => getCustomerStatement,
  recordCreditPayment: () => recordCreditPayment,
  searchOrCreateCustomer: () => searchOrCreateCustomer,
  updateCustomerCredit: () => updateCustomerCredit
});
init_db();
var isAdminRole = (role) => role === "admin" || role === "master-admin";
async function createOrUpdateCustomer(data) {
  const trimmedName = data.fullName.trim();
  if (!trimmedName) throw new Error("Nombre requerido");
  const session = await verifySession();
  const isAdmin = isAdminRole(session?.role);
  if (!isAdmin) {
    data.hasCredit = false;
    data.creditLimit = 0;
  }
  let existing = await db_default.customer.findFirst({
    where: {
      OR: [
        { fullName: trimmedName },
        data.documentId ? { documentId: data.documentId } : void 0
      ].filter(Boolean)
    }
  });
  if (existing) {
    const updated = await db_default.customer.update({
      where: { id: existing.id },
      data: {
        ...data,
        fullName: trimmedName
      }
    });
    await recordAudit({
      userId: "SYSTEM_OR_CURRENT",
      // Ideally passed from UI
      userName: "Administrator",
      action: "UPDATE",
      entity: "Customer",
      entityId: updated.id,
      description: `Actualiz\xF3 datos del cliente: ${updated.fullName}`,
      metadata: { old: existing, new: updated }
    });
    revalidatePath("/customers");
    return updated;
  } else {
    const created = await db_default.customer.create({
      data: {
        ...data,
        id: generateUUID(),
        fullName: trimmedName
      }
    });
    await recordAudit({
      userId: "SYSTEM_OR_CURRENT",
      userName: "Administrator",
      action: "CREATE",
      entity: "Customer",
      entityId: created.id,
      description: `Cre\xF3 nuevo cliente: ${created.fullName}`,
      metadata: { new: created }
    });
    revalidatePath("/customers");
    return created;
  }
}
async function searchOrCreateCustomer(fullName, documentId, phone) {
  if (!fullName || fullName.trim() === "") {
    throw new Error("Customer name is required");
  }
  const trimmedName = fullName.trim();
  let query = {};
  if (documentId) {
    query = { documentId };
  } else {
    query = { fullName: trimmedName };
  }
  let customer = await db_default.customer.findFirst({
    where: query
  });
  if (!customer) {
    customer = await db_default.customer.create({
      data: {
        id: generateUUID(),
        fullName: trimmedName,
        documentId: documentId || null,
        phone: phone || null,
        // Habilitar crédito por defecto para no bloquear ventas a crédito
        // de clientes creados rápidamente desde el POS.
        hasCredit: true,
        creditLimit: 0
      }
    });
  }
  return customer;
}
async function updateCustomerCredit(id, data) {
  try {
    const customer = await db_default.customer.update({
      where: { id },
      data
    });
    revalidatePath("/customers/credit");
    return { success: true, data: customer };
  } catch (error) {
    console.error("Error updating customer credit:", error);
    return { success: false, error: "Failed to update credit settings" };
  }
}
async function getCustomerStatement(id) {
  try {
    const customer = await db_default.customer.findUnique({
      where: { id },
      include: {
        salesInvoice: {
          orderBy: { date: "desc" },
          where: { paymentMethod: "Credito" }
        },
        creditPayment: {
          orderBy: { timestamp: "desc" }
        }
      }
    });
    return { success: true, data: customer };
  } catch (error) {
    console.error("Error fetching customer statement:", error);
    return { success: false, error: "Failed to fetch statement" };
  }
}
async function recordCreditPayment(data) {
  try {
    return await db_default.$transaction(async (tx) => {
      const payment = await tx.creditPayment.create({
        data: {
          id: generateUUID(),
          customerId: data.customerId,
          amount: data.amount,
          paymentMethod: data.paymentMethod,
          userId: data.userId,
          notes: data.notes
        }
      });
      await tx.customer.update({
        where: { id: data.customerId },
        data: {
          currentBalance: { decrement: data.amount }
        }
      });
      await tx.cashRegisterSession.update({
        where: { id: data.sessionId },
        data: {
          salesAbonos: { increment: data.amount }
        }
      });
      const customer = await tx.customer.findUnique({ where: { id: data.customerId } });
      await recordAudit({
        userId: data.userId,
        userName: "Cajero",
        // We should get the real name if possible
        action: "CREDIT_PAYMENT",
        entity: "Customer",
        entityId: data.customerId,
        description: `Recibi\xF3 abono de C$ ${data.amount} del cliente ${customer?.fullName}`,
        metadata: { amount: data.amount, paymentMethod: data.paymentMethod }
      });
      revalidatePath("/customers/credit");
      revalidatePath("/cash-count");
      return { success: true, data: payment };
    });
  } catch (error) {
    console.error("Error recording credit payment:", error);
    return { success: false, error: "Failed to record payment" };
  }
}
async function deleteCustomer(id, userId, userName) {
  try {
    const customer = await db_default.customer.findUnique({ where: { id } });
    if (!customer) throw new Error("Cliente no encontrado");
    await db_default.customer.delete({ where: { id } });
    await recordAudit({
      userId,
      userName,
      action: "DELETE",
      entity: "Customer",
      entityId: id,
      description: `Elimin\xF3 al cliente: ${customer.fullName}`,
      metadata: { deleted: customer }
    });
    revalidatePath("/customers");
    return { success: true };
  } catch (error) {
    console.error("Error deleting customer:", error);
    return { success: false, error: "No se puede eliminar el cliente (puede tener facturas asociadas)" };
  }
}
async function getCustomerByFullName(fullName) {
  if (!fullName) return null;
  return await db_default.customer.findFirst({
    where: { fullName: fullName.trim() }
  });
}
async function getAllCustomers() {
  return db_default.customer.findMany({
    orderBy: { fullName: "asc" }
  });
}

// src/lib/actions/dashboard.ts
var dashboard_exports = {};
__export(dashboard_exports, {
  getDashboardStats: () => getDashboardStats
});
init_db();
async function getDashboardStats(role, inventoryType, userId) {
  const today = /* @__PURE__ */ new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
  const next30Days = new Date(today);
  next30Days.setDate(today.getDate() + 30);
  const next30DaysIso = next30Days.toISOString();
  const todayIso = today.toISOString();
  const isAdmin = role === "master-admin" || role === "admin";
  const isJewelry = inventoryType === "jewelry";
  const isCashier = role === "cashier" && !!userId;
  const inventoryWhere = {};
  if (role === "dispatcher" || role === "cashier") {
    if (inventoryType) inventoryWhere.inventoryType = inventoryType;
  }
  const [
    sessions,
    openSessionsRaw,
    inventoryItems,
    productVariants,
    totalProductsCount,
    pendingApprovals,
    accountsPayableResult,
    accountsReceivableResult,
    stockMovementsToday,
    recentActivity,
    cashierData,
    jewelryData
  ] = await Promise.all([
    // 1. Total Revenue
    db_default.cashRegisterSession.findMany({ where: { status: "closed" }, select: { totalSales: true } }),
    // 2. Open sessions (admin only)
    isAdmin ? db_default.cashRegisterSession.findMany({
      where: { status: "open" },
      include: { user: { select: { name: true } } }
    }) : Promise.resolve([]),
    // 3. Inventory items
    db_default.inventoryItem.findMany({
      where: inventoryWhere,
      include: { product: { select: { costPriceNIO: true, minStock: true } } }
    }),
    // 4. Variant inventory items
    db_default.productVariant.findMany({
      where: {
        active: true,
        product: Object.keys(inventoryWhere).length ? inventoryWhere : void 0
      },
      include: {
        product: { select: { costPriceNIO: true, minStock: true } }
      }
    }),
    // 5. Total de productos / ítems del catálogo (distintos)
    db_default.product.count({
      where: Object.keys(inventoryWhere).length ? { inventoryType: inventoryWhere.inventoryType } : void 0
    }),
    // 6. Pending approvals count
    db_default.purchaseInvoice.count({ where: { status: { not: "Pagada" } } }),
    // 6. Accounts payable sum (saldo pendiente = total - pagado)
    db_default.purchaseInvoice.aggregate({
      _sum: { totalAmount: true, paidAmount: true },
      where: { status: { not: "Pagada" } }
    }),
    // 6b. Accounts receivable (Cuentas por Cobrar) — saldo pendiente de clientes
    db_default.customer.aggregate({
      _sum: { currentBalance: true }
    }),
    // 7. Stock movements today
    db_default.inventoryMovement.count({ where: { timestamp: { gte: startOfDay } } }),
    // 8. Recent activity
    db_default.inventoryMovement.findMany({
      take: 5,
      orderBy: { timestamp: "desc" },
      include: { user: { select: { name: true } } }
    }),
    // 9. Cashier-specific data (only when needed)
    isCashier ? Promise.all([
      db_default.cashRegisterSession.findFirst({ where: { cashierId: userId, status: "open" }, select: { totalSales: true, initialAmount: true } }),
      db_default.cashRegisterSession.findMany({ where: { cashierId: userId, openingTime: { gte: startOfDay } }, select: { totalSales: true } }),
      db_default.inventoryMovement.findMany({
        where: { userId, movementType: "Venta", timestamp: { gte: startOfDay } },
        select: { movementId: true },
        distinct: ["movementId"]
      })
    ]) : Promise.resolve(null),
    // 10. Jewelry stats (only when needed)
    isJewelry ? Promise.all([
      db_default.goldStock.findMany(),
      db_default.goldMarketPrice.findFirst({ orderBy: { createdAt: "desc" } }),
      db_default.financialTransaction.findMany({ select: { type: true, amount: true } }),
      db_default.jewelryPiece.findMany({ where: { status: "AVAILABLE" }, select: { calculatedPrice: true } })
    ]) : Promise.resolve(null)
  ]);
  const simpleInventoryCount = inventoryItems.reduce((acc, item) => acc + item.quantity, 0);
  const variantInventoryCount = productVariants.reduce((acc, item) => acc + item.stock, 0);
  const totalInventoryCount = simpleInventoryCount + variantInventoryCount;
  const simpleInventoryInvestment = inventoryItems.reduce((acc, item) => {
    return acc + item.quantity * (item.product.costPriceNIO || 0);
  }, 0);
  const variantInventoryInvestment = productVariants.reduce((acc, item) => {
    return acc + item.stock * (item.cost || item.product.costPriceNIO || 0);
  }, 0);
  const inventoryInvestment = simpleInventoryInvestment + variantInventoryInvestment;
  const stockByProduct = /* @__PURE__ */ new Map();
  for (const item of inventoryItems) {
    const id = item.productId || item.productName;
    stockByProduct.set(id, (stockByProduct.get(id) || 0) + item.quantity);
  }
  const lowStockProductIds = /* @__PURE__ */ new Set();
  for (const item of inventoryItems) {
    const total = stockByProduct.get(item.productId || item.productName) || 0;
    const min = item.product?.minStock ?? 10;
    if (total <= 0 || total < min) {
      lowStockProductIds.add(item.productId);
    }
  }
  const lowStockCount = lowStockProductIds.size + productVariants.filter((item) => item.stock > 0 && item.stock < (item.product.minStock || 1)).length;
  const expiringProductsCount = inventoryItems.filter((item) => {
    return item.expiryDate > todayIso && item.expiryDate <= next30DaysIso;
  }).length;
  const totalRevenue = sessions.reduce((acc, session) => acc + (session.totalSales || 0), 0);
  let todaysSalesCount = 0;
  let todaysSalesAmount = 0;
  let cashInRegister = 0;
  if (isCashier && cashierData) {
    const [activeSession, todaySessions, salesMovements] = cashierData;
    cashInRegister = (activeSession?.initialAmount || 0) + (activeSession?.totalSales || 0);
    todaysSalesAmount = todaySessions.reduce((acc, s) => acc + (s.totalSales || 0), 0);
    todaysSalesCount = salesMovements.length;
  }
  let jewelryStats = void 0;
  if (isJewelry && jewelryData) {
    const [goldStock, latestPrice, financials, pieces] = jewelryData;
    const marketPrice = latestPrice?.pricePerOunceUSD || 0;
    const marketPricePerGram = marketPrice / 31.1035;
    const totalInvestedUSD = financials.filter((f) => f.type === "EXPENSE").reduce((acc, f) => acc + f.amount, 0);
    const totalSoldUSD = financials.filter((f) => f.type === "INCOME").reduce((acc, f) => acc + f.amount, 0);
    const piecesValue = pieces.reduce((acc, p) => acc + p.calculatedPrice, 0);
    const stockValue = goldStock.reduce((acc, s) => acc + s.gramsAvailable * marketPricePerGram, 0);
    jewelryStats = {
      gramsByKarat: goldStock.map((s) => ({ karat: s.karat, grams: s.gramsAvailable })),
      totalInventoryValueUSD: piecesValue + stockValue,
      totalInvestedUSD,
      totalSoldUSD,
      estimatedProfitUSD: totalSoldUSD - totalInvestedUSD,
      currentMarketPrice: marketPrice
    };
  }
  return {
    totalRevenue,
    totalInventoryCount,
    totalProducts: totalProductsCount,
    pendingApprovals,
    inventoryInvestment,
    lowStockCount,
    expiringProductsCount,
    todaysSalesCount,
    todaysSalesAmount,
    cashInRegister,
    recentActivity,
    accountsPayable: (accountsPayableResult._sum.totalAmount || 0) - (accountsPayableResult._sum.paidAmount || 0),
    accountsReceivable: accountsReceivableResult?._sum?.currentBalance || 0,
    stockMovementsToday,
    openSessions: openSessionsRaw,
    jewelryStats
  };
}

// src/lib/actions/delivery-routes.ts
var delivery_routes_exports = {};
__export(delivery_routes_exports, {
  createDeliveryRoute: () => createDeliveryRoute,
  getDeliveryRouteById: () => getDeliveryRouteById,
  getDeliveryRoutes: () => getDeliveryRoutes,
  getRuteros: () => getRuteros,
  updateRouteStatus: () => updateRouteStatus,
  updateStopStatus: () => updateStopStatus
});
init_db();
async function getDeliveryRoutes() {
  const session = await verifySession();
  if (!session) return { success: false, error: "Unauthorized" };
  await BusinessGuard.assertMode("DISTRIBUIDORA");
  try {
    const routes = await db_default.deliveryRoute.findMany({
      orderBy: { date: "desc" },
      include: {
        rutero: { select: { name: true } },
        stops: {
          include: {
            customer: { select: { fullName: true } },
            order: { select: { orderNumber: true, totalAmount: true } }
          }
        }
      }
    });
    return { success: true, data: routes };
  } catch (error) {
    console.error("Error fetching routes:", error);
    return { success: false, error: "Failed to fetch routes" };
  }
}
async function getDeliveryRouteById(id) {
  const session = await verifySession();
  if (!session) return { success: false, error: "Unauthorized" };
  await BusinessGuard.assertMode("DISTRIBUIDORA");
  try {
    const route = await db_default.deliveryRoute.findUnique({
      where: { id },
      include: {
        rutero: { select: { name: true } },
        stops: {
          orderBy: { id: "asc" },
          include: {
            customer: { select: { fullName: true, phone: true, address: true } },
            order: { select: { orderNumber: true, totalAmount: true, paidAmount: true, status: true } }
          }
        }
      }
    });
    return { success: true, data: route };
  } catch (error) {
    console.error("Error fetching route:", error);
    return { success: false, error: "Failed to fetch route" };
  }
}
async function createDeliveryRoute(data) {
  const session = await verifySession();
  if (!session || session.role !== "master-admin" && session.role !== "admin") {
    return { success: false, error: "Unauthorized" };
  }
  await BusinessGuard.assertMode("DISTRIBUIDORA");
  try {
    const route = await db_default.deliveryRoute.create({
      data: {
        id: generateUUID(),
        name: data.name,
        ruteroId: data.ruteroId || null,
        date: new Date(data.date),
        stops: {
          create: data.stops.map((stop) => ({
            id: generateUUID(),
            customerId: stop.customerId,
            orderId: stop.orderId || null,
            address: stop.address || null,
            notes: stop.notes || null
          }))
        }
      },
      include: {
        stops: true
      }
    });
    revalidatePath("/delivery-routes");
    return { success: true, data: route };
  } catch (error) {
    console.error("Error creating route:", error);
    return { success: false, error: "Failed to create route" };
  }
}
async function updateRouteStatus(id, status) {
  const session = await verifySession();
  if (!session) return { success: false, error: "Unauthorized" };
  await BusinessGuard.assertMode("DISTRIBUIDORA");
  try {
    const route = await db_default.deliveryRoute.update({
      where: { id },
      data: { status }
    });
    revalidatePath("/delivery-routes");
    revalidatePath(`/delivery-routes/${id}`);
    return { success: true, data: route };
  } catch (error) {
    console.error("Error updating route status:", error);
    return { success: false, error: "Failed to update route status" };
  }
}
async function updateStopStatus(stopId, status) {
  const session = await verifySession();
  if (!session) return { success: false, error: "Unauthorized" };
  await BusinessGuard.assertMode("DISTRIBUIDORA");
  try {
    const stop = await db_default.deliveryRouteStop.update({
      where: { id: stopId },
      data: {
        status,
        visitedAt: status === "VISITED" ? /* @__PURE__ */ new Date() : void 0
      }
    });
    revalidatePath("/delivery-routes");
    return { success: true, data: stop };
  } catch (error) {
    console.error("Error updating stop status:", error);
    return { success: false, error: "Failed to update stop status" };
  }
}
async function getRuteros() {
  try {
    const ruteros = await db_default.user.findMany({
      where: { role: "rutero", isEnabled: true },
      select: { id: true, name: true }
    });
    return { success: true, data: ruteros };
  } catch (error) {
    console.error("Error fetching ruteros:", error);
    return { success: false, error: "Failed to fetch ruteros" };
  }
}

// src/lib/actions/export.ts
var export_exports = {};
__export(export_exports, {
  exportInventoryToExcel: () => exportInventoryToExcel
});
init_db();
async function exportInventoryToExcel() {
  try {
    const inventory = await db_default.inventoryItem.findMany({
      include: {
        product: true
      },
      orderBy: {
        productName: "asc"
      }
    });
    const excelData = inventory.map((item) => ({
      "Nombre del Producto": item.productName,
      "C\xF3digo de Barras": item.barcode || "",
      "Categor\xEDa": item.product.category,
      "Precio de Venta (C$)": item.product.priceNIO,
      "Precio de Costo (C$)": item.product.costPriceNIO || 0,
      "Stock M\xEDnimo": item.product.minStock || 50,
      "Unidad de Medida": item.product.unitOfMeasure,
      "Tipo de Inventario": item.inventoryType,
      "Lote": item.batch,
      "Cantidad": item.quantity,
      "Fecha de Vencimiento": item.expiryDate
    }));
    return {
      success: true,
      data: excelData
    };
  } catch (error) {
    console.error("Error exporting inventory:", error);
    return {
      success: false,
      error: "Failed to export inventory"
    };
  }
}

// src/lib/actions/gold-purchase.ts
var gold_purchase_exports = {};
__export(gold_purchase_exports, {
  getGoldPurchaseHistory: () => getGoldPurchaseHistory,
  getLatestGoldPrice: () => getLatestGoldPrice,
  saveGoldPurchase: () => saveGoldPurchase
});
init_db();

// src/lib/services/gold-pricing-engine.ts
var TROY_CONSTANT = 31.1;
var GoldPricingEngine = class {
  static calculateCommercial(input) {
    const {
      grossWeightGrams,
      purityPercent,
      marketPricePerOunce,
      marginPercent = 63,
      exchangeRate = 36.5
    } = input;
    if (grossWeightGrams <= 0) return null;
    if (purityPercent <= 0 || purityPercent > 100) return null;
    if (marketPricePerOunce <= 0) return null;
    if (exchangeRate <= 0) return null;
    const pricePerGram24k = this.round(marketPricePerOunce / TROY_CONSTANT * exchangeRate, 2);
    const fineGoldGrams = grossWeightGrams * (purityPercent / 100);
    const onzasFinas = this.round(fineGoldGrams / TROY_CONSTANT, 4);
    const valorMercadoPieza = fineGoldGrams * pricePerGram24k;
    const totalPagar = this.round(valorMercadoPieza * (marginPercent / 100), 2);
    const totalUSD = this.round(totalPagar / exchangeRate, 2);
    const quilatajeReal = purityPercent * 24 / 100;
    const precioPuroUSD = marketPricePerOunce / TROY_CONSTANT;
    const precioPuroCordobas = pricePerGram24k;
    const valorPiezaGramos = this.round(valorMercadoPieza / grossWeightGrams, 4);
    const precioFinalGramos = this.round(totalPagar / grossWeightGrams, 4);
    return {
      // Pasos de la fórmula de mostrador
      precioPuroUSD: this.round(precioPuroUSD, 6),
      precioPuroCordobas,
      valorPiezaGramos: this.round(valorPiezaGramos, 4),
      precioFinalGramos: this.round(precioFinalGramos, 4),
      totalPagar,
      // Informativos
      kilataje: quilatajeReal,
      quilatajeReal,
      karatEquivalent: this.round(quilatajeReal, 2),
      totalUSD,
      // Alias de compatibilidad
      totalComercial: totalPagar,
      totalPagarCordobas: totalPagar,
      totalLocal: totalPagar,
      valueLocalCurrency: totalPagar,
      finalPaidAmount: totalUSD,
      marginApplied: 0,
      marginValue: 0,
      baseValueUSD: totalUSD,
      valueUSD: totalUSD,
      fineGoldGrams: this.round(fineGoldGrams, 3),
      fineGoldOunces: onzasFinas,
      totalGrossUSD: totalUSD,
      netPayableUSD: totalUSD,
      paymentFactor: marginPercent / 100,
      karatUsed: quilatajeReal,
      pricePerPureGram: pricePerGram24k,
      pricePerGramPiece: this.round(valorPiezaGramos, 4),
      precioAjustadoUSD: totalUSD,
      precioAjustadoCordobas: totalPagar,
      precioGramo24k: pricePerGram24k,
      precioPorQuilate: this.round(pricePerGram24k / 24, 4),
      precioGramoPieza: this.round(valorPiezaGramos, 4)
    };
  }
  /** Método principal */
  static calculate(input) {
    return this.calculateCommercial(input);
  }
  static round(value, decimals) {
    const factor = Math.pow(10, decimals);
    return Math.round((value + Number.EPSILON) * factor) / factor;
  }
};

// src/lib/actions/gold-purchase.ts
init_gold_inventory_service();

// src/lib/services/financial-service.ts
var FinancialService = class {
  /**
   * Records a financial transaction.
   * MUST be called within an existing Prisma transaction.
   */
  static async record(tx, data) {
    return await tx.financialTransaction.create({
      data: {
        type: data.type,
        amount: data.amount,
        referenceId: data.referenceId,
        description: data.description
      }
    });
  }
};

// src/lib/actions/gold-purchase.ts
async function saveGoldPurchase(input) {
  try {
    const pricingResult = GoldPricingEngine.calculate({
      grossWeightGrams: input.grossWeightGrams,
      purityPercent: input.purityPercent,
      marketPricePerOunce: input.marketPricePerOunce,
      marginPercent: input.marginPercent,
      exchangeRate: input.exchangeRate,
      troyOunceGrams: input.troyOunceGrams
    });
    if (!pricingResult) {
      throw new Error("Par\xE1metros de c\xE1lculo inv\xE1lidos");
    }
    const purchase = await db_default.$transaction(async (tx) => {
      const newPurchase = await tx.goldPurchase.create({
        data: {
          customerId: input.customerId,
          grossWeightGrams: input.grossWeightGrams,
          purityPercent: input.purityPercent,
          fineGoldGrams: pricingResult.fineGoldGrams,
          fineGoldOunces: pricingResult.fineGoldOunces,
          karatEquivalent: pricingResult.karatEquivalent,
          marketPriceUsed: input.marketPricePerOunce,
          valueUSD: pricingResult.valueUSD,
          exchangeRate: input.exchangeRate || 1,
          valueLocalCurrency: pricingResult.valueLocalCurrency,
          marginPercent: input.marginPercent || 0,
          finalPaidAmount: pricingResult.finalPaidAmount,
          troyOunceGrams: input.troyOunceGrams,
          status: "IN_STOCK"
        }
      });
      await GoldInventoryService.adjustStock(tx, {
        karat: Math.round(pricingResult.karatEquivalent),
        // Precision adjustment for stock category
        grams: input.grossWeightGrams,
        type: "PURCHASE",
        referenceId: newPurchase.id,
        userId: input.userId
      });
      await FinancialService.record(tx, {
        type: "EXPENSE",
        amount: pricingResult.finalPaidAmount,
        referenceId: newPurchase.id,
        description: `Compra de oro: ${input.grossWeightGrams}g (${pricingResult.karatEquivalent}K) - Cliente ID: ${input.customerId}`
      });
      await tx.auditLog.create({
        data: {
          userId: input.userId,
          action: "CREATE_GOLD_PURCHASE",
          entity: "GoldPurchase",
          entityId: newPurchase.id
        }
      });
      await tx.goldMarketPrice.create({
        data: {
          pricePerOunceUSD: input.marketPricePerOunce
        }
      });
      return newPurchase;
    });
    revalidatePath("/jewelry/inventory");
    revalidatePath("/dashboard");
    return { success: true, data: purchase };
  } catch (error) {
    console.error("Error saving gold purchase:", error);
    return { success: false, error: error.message || "Error interno al guardar la compra" };
  }
}
async function getLatestGoldPrice() {
  try {
    const latest = await db_default.goldMarketPrice.findFirst({
      orderBy: { createdAt: "desc" }
    });
    return { success: true, price: latest?.pricePerOunceUSD || 0 };
  } catch (error) {
    console.error("Error fetching latest gold price:", error);
    return { success: false, error: "Error al obtener el precio del mercado" };
  }
}
async function getGoldPurchaseHistory(limit = 10) {
  try {
    const history = await db_default.goldPurchase.findMany({
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        customer: {
          select: { fullName: true }
        }
      }
    });
    return { success: true, data: history };
  } catch (error) {
    console.error("Error fetching gold purchase history:", error);
    return { success: false, error: "Error al obtener el historial de compras" };
  }
}

// src/lib/actions/gold.ts
var gold_exports = {};
__export(gold_exports, {
  buyGold: () => buyGold,
  meltGold: () => meltGold
});
init_db();

// src/lib/modules/jewelry/pricing-engine.ts
var JewelryPricingEngine = class {
  /**
   * Obtiene el precio por gramo de acuerdo al kilataje,
   * derivado del precio del oro puro (24k).
   * 
   * Fórmula: (Precio Mercado * Kilataje) / 24
   */
  static getPricePerGram(karat, basePrice24k) {
    return basePrice24k * karat / 24;
  }
  /**
   * Calcula la cantidad de oro puro en gramos para un peso bruto.
   */
  static getPureGoldWeight(grossWeight, karat) {
    return grossWeight * karat / 24;
  }
  /**
   * Calcula el precio de venta sugerido (salePrice) de una pieza
   * Sale Price = (Weight * currentGoldPriceForKarat) + LaborCost + Margin
   * Tenga en cuenta que el margin se aplica como porcentaje extra sobre los costos totales
   * o como un valor fijo si se decide. Según el requerimiento, la fórmula es:
   * (weight * currentGoldPrice) + laborCost + margin
   * Asumiremos que margin es un valor monetario directo de ganancia neta.
   * Si 'margin' representa porcentaje, puede ajustarse este motor.
   */
  static calculatePiecePrice(params) {
    const pricePerGram = this.getPricePerGram(params.karat, params.currentGoldPrice);
    const materialCost = params.weight * pricePerGram;
    const baseCost = materialCost + params.laborCost;
    const finalPrice = materialCost + params.laborCost + params.margin;
    return Number(finalPrice.toFixed(2));
  }
  /**
   * Calcula el porcentaje de margen real obtenido a partir de un precio overrideado
   */
  static calculateRealMargin(overridePrice, params) {
    const pricePerGram = this.getPricePerGram(params.karat, params.currentGoldPrice);
    const materialCost = params.weight * pricePerGram;
    return Number((overridePrice - materialCost - params.laborCost).toFixed(2));
  }
};

// src/lib/actions/gold.ts
async function buyGold(customerName, grossWeight, karat, marketPrice, userId) {
  await BusinessGuard.assertMode("JEWELRY");
  if (!customerName || customerName.trim() === "") {
    throw new Error("Customer is required for gold purchase.");
  }
  const pricePerGram = JewelryPricingEngine.getPricePerGram(karat, marketPrice);
  const pureGoldWeight = JewelryPricingEngine.getPureGoldWeight(grossWeight, karat);
  const totalPaid = grossWeight * pricePerGram;
  return await db_default.$transaction(async (tx) => {
    const customer = await searchOrCreateCustomer(customerName);
    const goldPurchase = await tx.goldPurchase.create({
      data: {
        customerId: customer.id,
        grossWeight,
        karat,
        pureGoldWeight,
        marketPrice,
        pricePerGram,
        totalPaid,
        status: "IN_STOCK"
      }
    });
    const existingStock = await tx.goldStock.findUnique({
      where: { karat }
    });
    if (existingStock) {
      await tx.goldStock.update({
        where: { karat },
        data: { gramsAvailable: { increment: grossWeight } }
      });
    } else {
      await tx.goldStock.create({
        data: { karat, gramsAvailable: grossWeight }
      });
    }
    await tx.auditLog.create({
      data: {
        userId,
        action: "GOLD_PURCHASE",
        entity: "GoldPurchase",
        entityId: goldPurchase.id
      }
    });
    return goldPurchase;
  });
}
async function meltGold(purchaseId, userId) {
  await BusinessGuard.assertMode("JEWELRY");
  return await db_default.$transaction(async (tx) => {
    const purchase = await tx.goldPurchase.findUnique({ where: { id: purchaseId } });
    if (!purchase) throw new Error("Purchase not found");
    if (purchase.status !== "IN_STOCK") throw new Error("Only IN_STOCK gold can be melted");
    const updated = await tx.goldPurchase.update({
      where: { id: purchaseId },
      data: { status: "MELTED" }
    });
    await tx.goldStock.update({
      where: { karat: purchase.karat },
      data: { gramsAvailable: { decrement: purchase.grossWeight } }
    });
    await tx.auditLog.create({
      data: {
        userId,
        action: "GOLD_MELTED",
        entity: "GoldPurchase",
        entityId: purchaseId
      }
    });
    return updated;
  });
}

// src/lib/actions/held-sales.ts
var held_sales_exports = {};
__export(held_sales_exports, {
  cancelHeldSale: () => cancelHeldSale,
  completeHeldSale: () => completeHeldSale,
  createHeldOrder: () => createHeldOrder,
  createHeldSale: () => createHeldSale,
  deleteHeldSale: () => deleteHeldSale,
  getHeldOrders: () => getHeldOrders,
  getPendingHeldSales: () => getPendingHeldSales,
  lockHeldSale: () => lockHeldSale,
  promoteHeldOrder: () => promoteHeldOrder,
  unlockHeldSale: () => unlockHeldSale,
  updateHeldSale: () => updateHeldSale
});
init_db();
async function createHeldSale(data) {
  const session = await verifySession();
  if (!session) return { success: false, error: "Unauthorized" };
  try {
    const sale = await db_default.heldSale.create({
      data: {
        id: generateUUID(),
        dispatcherId: data.dispatcherId,
        dispatcherName: data.dispatcherName,
        customerName: data.customerName ?? null,
        items: data.items,
        total: data.total,
        status: "PENDING",
        orderId: data.orderId ?? null
      }
    });
    revalidatePath("/pos");
    return { success: true, data: sale };
  } catch (error) {
    console.error("Error creating held sale:", error);
    return { success: false, error: "Failed to create held sale" };
  }
}
async function createHeldOrder(data) {
  const session = await verifySession();
  if (!session) return { success: false, error: "Unauthorized" };
  try {
    const sale = await db_default.heldSale.create({
      data: {
        id: generateUUID(),
        dispatcherId: data.dispatcherId,
        dispatcherName: data.dispatcherName,
        customerName: data.customerName ?? null,
        items: data.items,
        total: data.total,
        status: "HELD",
        orderId: null
      }
    });
    revalidatePath("/pos");
    return { success: true, data: sale };
  } catch (error) {
    console.error("Error creating held order:", error);
    return { success: false, error: "Failed to create held order" };
  }
}
async function getHeldOrders() {
  const session = await verifySession();
  if (!session) return { success: false, data: [] };
  try {
    const sales = await db_default.heldSale.findMany({
      where: { status: "HELD" },
      orderBy: { createdAt: "desc" }
    });
    return { success: true, data: sales };
  } catch (error) {
    console.error("Error fetching held orders:", error);
    return { success: false, error: "Failed to fetch held orders" };
  }
}
async function promoteHeldOrder(id) {
  const session = await verifySession();
  if (!session) return { success: false, error: "Unauthorized" };
  try {
    const existing = await db_default.heldSale.findUnique({ where: { id }, select: { status: true } });
    if (!existing) return { success: false, error: "Pedido no encontrado" };
    if (existing.status !== "HELD") return { success: false, error: "El pedido ya no est\xE1 en espera" };
    const sale = await db_default.heldSale.update({
      where: { id },
      data: { status: "PENDING", lockedBy: null }
    });
    revalidatePath("/pos");
    return { success: true, data: sale };
  } catch (error) {
    console.error("Error promoting held order:", error);
    return { success: false, error: "Failed to promote held order" };
  }
}
async function getPendingHeldSales() {
  const session = await verifySession();
  if (!session) return { success: false, data: [] };
  try {
    const sales = await db_default.heldSale.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "desc" }
    });
    return { success: true, data: sales };
  } catch (error) {
    console.error("Error fetching held sales:", error);
    return { success: false, error: "Failed to fetch held sales" };
  }
}
async function completeHeldSale(id, invoiceId) {
  const session = await verifySession();
  if (!session) return { success: false, error: "Unauthorized" };
  try {
    const sale = await db_default.heldSale.update({
      where: { id },
      data: {
        status: "BILLED",
        invoiceId: invoiceId ?? null
      }
    });
    if (sale.orderId) {
      await db_default.customerOrder.updateMany({
        where: { id: sale.orderId, status: { not: "FACTURADO" } },
        data: { status: "FACTURADO" }
      });
      revalidatePath(`/orders/${sale.orderId}`);
    }
    revalidatePath("/pos");
    return { success: true, data: sale };
  } catch (error) {
    console.error("Error completing held sale:", error);
    return { success: false, error: "Failed to complete held sale" };
  }
}
async function cancelHeldSale(id) {
  const session = await verifySession();
  if (!session) return { success: false, error: "Unauthorized" };
  try {
    const sale = await db_default.heldSale.update({
      where: { id },
      data: { status: "CANCELLED", lockedBy: null }
    });
    revalidatePath("/pos");
    return { success: true, data: sale };
  } catch (error) {
    console.error("Error cancelling held sale:", error);
    return { success: false, error: "Failed to cancel held sale" };
  }
}
async function updateHeldSale(id, items, total) {
  const session = await verifySession();
  if (!session) return { success: false, error: "Unauthorized" };
  try {
    const sale = await db_default.heldSale.update({
      where: { id },
      data: { items, total }
    });
    revalidatePath("/pos");
    return { success: true, data: sale };
  } catch (error) {
    console.error("Error updating held sale:", error);
    return { success: false, error: "Failed to update held sale" };
  }
}
async function lockHeldSale(id, userId) {
  const session = await verifySession();
  if (!session) return { success: false, error: "Unauthorized" };
  try {
    const existing = await db_default.heldSale.findUnique({ where: { id }, select: { lockedBy: true, status: true } });
    if (!existing) return { success: false, error: "Comanda no encontrada" };
    if (existing.status !== "PENDING") return { success: false, error: "La comanda ya no est\xE1 disponible" };
    if (existing.lockedBy && existing.lockedBy !== userId) {
      return { success: false, error: "La comanda est\xE1 siendo atendida por otro cajero" };
    }
    const sale = await db_default.heldSale.update({
      where: { id },
      data: { lockedBy: userId }
    });
    revalidatePath("/pos");
    return { success: true, data: sale };
  } catch (error) {
    console.error("Error locking held sale:", error);
    return { success: false, error: "Failed to lock held sale" };
  }
}
async function deleteHeldSale(id) {
  const session = await verifySession();
  if (!session) return { success: false, error: "Unauthorized" };
  try {
    await db_default.heldSale.delete({ where: { id } });
    revalidatePath("/pos");
    return { success: true };
  } catch (error) {
    console.error("Error deleting held sale:", error);
    return { success: false, error: "Failed to delete held sale" };
  }
}
async function unlockHeldSale(id) {
  const session = await verifySession();
  if (!session) return { success: false, error: "Unauthorized" };
  try {
    const sale = await db_default.heldSale.update({
      where: { id },
      data: { lockedBy: null }
    });
    revalidatePath("/pos");
    return { success: true, data: sale };
  } catch (error) {
    console.error("Error unlocking held sale:", error);
    return { success: false, error: "Failed to unlock held sale" };
  }
}

// src/lib/actions/import-history.ts
var import_history_exports = {};
__export(import_history_exports, {
  createImportHistory: () => createImportHistory,
  getImportDetails: () => getImportDetails,
  getImportHistory: () => getImportHistory
});
init_db();
async function getImportHistory() {
  try {
    const history = await db_default.importHistory.findMany({
      include: {
        user: {
          select: {
            name: true,
            role: true
          }
        }
      },
      orderBy: {
        importedAt: "desc"
      }
    });
    return { success: true, data: history };
  } catch (error) {
    console.error("Error fetching import history:", error);
    return { success: false, error: "Failed to fetch import history" };
  }
}
async function getImportDetails(id) {
  try {
    const details = await db_default.importHistory.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            name: true,
            role: true
          }
        }
      }
    });
    if (!details) {
      return { success: false, error: "Import not found" };
    }
    return { success: true, data: details };
  } catch (error) {
    console.error("Error fetching import details:", error);
    return { success: false, error: "Failed to fetch import details" };
  }
}
async function createImportHistory(data) {
  try {
    const history = await db_default.importHistory.create({
      data: {
        fileName: data.fileName,
        importedBy: data.importedBy,
        mode: data.mode,
        totalRows: data.totalRows,
        successfulRows: data.successfulRows,
        failedRows: data.failedRows,
        productsCreated: data.productsCreated,
        productsUpdated: data.productsUpdated,
        inventoryItemsCreated: data.inventoryItemsCreated,
        errors: data.errors,
        summary: data.summary
      }
    });
    return { success: true, data: history };
  } catch (error) {
    console.error("Error creating import history:", error);
    return { success: false, error: "Failed to create import history" };
  }
}

// src/lib/actions/init-data.ts
var init_data_exports = {};
__export(init_data_exports, {
  getInitialAppData: () => getInitialAppData
});
init_db();
async function getInitialAppData() {
  const session = await verifySession();
  if (!session) {
    return {
      settings: null,
      businessMode: "PHARMACY",
      sessions: [],
      user: null
    };
  }
  checkUnclosedBoxes().catch(console.error);
  const [settingsRow, sessionsRaw, userRow] = await Promise.all([
    db_default.systemSettings.findFirst(),
    db_default.cashRegisterSession.findMany({
      orderBy: { openingTime: "desc" }
    }),
    db_default.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        name: true,
        role: true,
        status: true,
        inventoryType: true,
        assignedLocation: true
      }
    })
  ]);
  const sessions = sessionsRaw.map((s) => ({
    id: s.id,
    cashierId: s.cashierId,
    cashierName: s.cashierName,
    openingTime: s.openingTime,
    closingTime: s.closingTime,
    initialAmount: s.initialAmount,
    initialAmountUSD: s.initialAmountUSD ?? 0,
    finalAmount: s.finalAmount,
    totalSales: s.totalSales,
    salesCash: s.salesCash,
    salesCard: s.salesCard,
    salesUSD: s.salesUSD,
    salesServices: s.salesServices ?? 0,
    salesCredit: s.salesCredit ?? 0,
    salesAbonos: s.salesAbonos ?? 0,
    totalReturns: s.totalReturns,
    actualCash: s.actualCash,
    actualUSD: s.actualUSD ?? 0,
    difference: s.difference,
    differenceUSD: s.differenceUSD ?? 0,
    status: s.status
  }));
  const businessMode = settingsRow?.businessMode ?? "PHARMACY";
  return {
    settings: settingsRow ? {
      pharmacyName: settingsRow.pharmacyName,
      address: settingsRow.address,
      phone: settingsRow.phone,
      rfc: settingsRow.rfc,
      footerMessage: settingsRow.footerMessage,
      website: settingsRow.website,
      includeUnitPrice: settingsRow.includeUnitPrice,
      printFullDescription: settingsRow.printFullDescription,
      currency: settingsRow.currency,
      taxRate: settingsRow.taxRate,
      applyTax: settingsRow.applyTax,
      recoveryKey: settingsRow.recoveryKey,
      workflow: settingsRow.workflow,
      quickSwitchEnabled: settingsRow.quickSwitchEnabled,
      exchangeRate: settingsRow.exchangeRate,
      allowCash: settingsRow.allowCash,
      blockInsufficientCash: settingsRow.blockInsufficientCash,
      allowDollars: settingsRow.allowDollars,
      allowCard: settingsRow.allowCard,
      troyOunceGrams: settingsRow.troyOunceGrams,
      isPremium: settingsRow.isPremium,
      logoSvg: settingsRow.logoSvg,
      jewelryLocationMode: settingsRow.jewelryLocationMode,
      adminEmail: settingsRow.adminEmail,
      smtpEmail: settingsRow.smtpEmail,
      smtpPassword: settingsRow.smtpPassword,
      emailNotificationsEnabled: settingsRow.emailNotificationsEnabled,
      licenseStartDate: settingsRow.licenseStartDate,
      licenseExpirationDate: settingsRow.licenseExpirationDate,
      licenseStatus: settingsRow.licenseStatus,
      invoiceAlertDays: settingsRow.invoiceAlertDays,
      importProductsInDollars: settingsRow.importProductsInDollars
    } : null,
    businessMode,
    sessions,
    user: userRow ? {
      id: userRow.id,
      name: userRow.name,
      role: userRow.role,
      status: userRow.status,
      inventoryType: userRow.inventoryType,
      assignedLocation: userRow.assignedLocation
    } : null
  };
}

// src/lib/actions/inventory.ts
var inventory_exports = {};
__export(inventory_exports, {
  bulkImportInventory: () => bulkImportInventory,
  createInventoryItem: () => createInventoryItem,
  createInventoryMovement: () => createInventoryMovement,
  getInventory: () => getInventory,
  getInventoryItemById: () => getInventoryItemById,
  getInventoryMovements: () => getInventoryMovements,
  updateInventoryItem: () => updateInventoryItem,
  updateInventoryQuantity: () => updateInventoryQuantity
});
init_db();
async function getInventory(inventoryType) {
  const session = await verifySession();
  if (!session) return { success: false, error: "Unauthorized" };
  try {
    const where = inventoryType ? { inventoryType } : {};
    const inventory = await db_default.inventoryItem.findMany({
      where,
      include: {
        product: true
      },
      orderBy: { productName: "asc" }
    });
    return { success: true, data: inventory };
  } catch (error) {
    console.error("Error fetching inventory:", error);
    return { success: false, error: "Failed to fetch inventory" };
  }
}
async function getInventoryItemById(id) {
  const session = await verifySession();
  if (!session) return { success: false, error: "Unauthorized" };
  try {
    const item = await db_default.inventoryItem.findUnique({
      where: { id },
      include: { product: true }
    });
    return { success: true, data: item };
  } catch (error) {
    console.error("Error fetching inventory item:", error);
    return { success: false, error: "Failed to fetch inventory item" };
  }
}
async function createInventoryItem(data) {
  const session = await verifySession();
  if (!session) return { success: false, error: "Unauthorized" };
  try {
    const item = await db_default.inventoryItem.create({
      data: { id: generateUUID(), ...data }
    });
    if (typeof item.quantity === "number" && item.quantity > 0) {
      const currentStockRecords = await db_default.inventoryItem.findMany({
        where: {
          productId: item.productId,
          inventoryType: item.inventoryType || void 0
        }
      });
      const currentTotal = currentStockRecords.reduce((sum, i) => sum + (i.quantity || 0), 0);
      const previousTotal = currentTotal - item.quantity;
      await db_default.inventoryMovement.create({
        data: {
          id: generateUUID(),
          timestamp: (/* @__PURE__ */ new Date()).toISOString(),
          productName: item.productName,
          movementType: "Entrada",
          movementId: `AJUSTE-${item.id.slice(0, 8)}`,
          quantityChange: item.quantity,
          previousQuantity: previousTotal,
          newQuantity: currentTotal,
          userId: session.userId,
          inventoryType: item.inventoryType || "general"
        }
      });
    }
    try {
      const actor = await db_default.user.findUnique({ where: { id: session.userId }, select: { name: true } });
      await recordAudit({
        userId: session.userId,
        userName: actor?.name || "Usuario",
        action: "CREATE",
        entity: "Inventory",
        entityId: item.id,
        description: `A\xF1adi\xF3 el art\xEDculo de inventario: ${item.productName}${item.batch ? ` (lote ${item.batch})` : ""}`,
        metadata: { productName: item.productName, quantity: item.quantity, batch: item.batch, inventoryType: item.inventoryType }
      });
    } catch (auditError) {
      console.error("Error recording inventory create audit:", auditError);
    }
    revalidatePath("/inventory");
    revalidatePath("/pos");
    revalidatePath("/kardex");
    return { success: true, data: item };
  } catch (error) {
    console.error("Error creating inventory item:", error);
    return {
      success: false,
      error: "Failed to create inventory item",
      details: error instanceof Error ? error.message : String(error)
    };
  }
}
async function updateInventoryItem(id, data) {
  const session = await verifySession();
  if (!session) return { success: false, error: "Unauthorized" };
  try {
    const variant = await db_default.productVariant.findUnique({ where: { id } });
    if (variant) {
      const previousStock = variant.stock;
      await db_default.productVariant.update({
        where: { id },
        data: {
          stock: typeof data.quantity === "number" ? data.quantity : void 0,
          barcode: data.barcode || void 0
        }
      });
      try {
        const actor = await db_default.user.findUnique({ where: { id: session.userId }, select: { name: true } });
        await recordAudit({
          userId: session.userId,
          userName: actor?.name || "Usuario",
          action: "UPDATE",
          entity: "InventoryVariant",
          entityId: id,
          description: `Ajust\xF3 el stock de una variante de ${previousStock ?? "N/A"} a ${data.quantity ?? previousStock}`,
          metadata: { previousStock, newStock: data.quantity ?? previousStock }
        });
      } catch (auditError) {
        console.error("Error recording variant audit:", auditError);
      }
      revalidatePath("/inventory");
      revalidatePath("/pos");
      return { success: true };
    }
    const item = await db_default.inventoryItem.update({
      where: { id },
      data
    });
    try {
      const actor = await db_default.user.findUnique({ where: { id: session.userId }, select: { name: true } });
      await recordAudit({
        userId: session.userId,
        userName: actor?.name || "Usuario",
        action: "UPDATE",
        entity: "Inventory",
        entityId: id,
        description: `Modific\xF3 el art\xEDculo de inventario: ${item.productName}`,
        metadata: { productName: item.productName, quantity: item.quantity, updated: Object.keys(data) }
      });
    } catch (auditError) {
      console.error("Error recording inventory update audit:", auditError);
    }
    revalidatePath("/inventory");
    revalidatePath("/pos");
    return { success: true };
  } catch (error) {
    console.error("Error updating inventory item:", error);
    return { success: false, error: "Failed to update inventory item" };
  }
}
async function updateInventoryQuantity(id, quantityChange) {
  const session = await verifySession();
  if (!session) return { success: false, error: "Unauthorized" };
  try {
    const updatedItem = await db_default.inventoryItem.update({
      where: { id },
      data: {
        quantity: {
          increment: quantityChange
        }
      }
    });
    const newQuantity = updatedItem.quantity;
    const status = newQuantity <= 0 ? "Agotado" : newQuantity < 10 ? "Stock Bajo" : "En Stock";
    if (updatedItem.status !== status) {
      await db_default.inventoryItem.update({
        where: { id },
        data: { status }
      });
    }
    if (status === "Stock Bajo" || status === "Agotado") {
      await notifyLowStock(updatedItem.productName);
    }
    try {
      const actor = await db_default.user.findUnique({ where: { id: session.userId }, select: { name: true } });
      await recordAudit({
        userId: session.userId,
        userName: actor?.name || "Usuario",
        action: "UPDATE",
        entity: "Inventory",
        entityId: id,
        description: `Ajust\xF3 manualmente el stock de ${updatedItem.productName} en ${quantityChange > 0 ? "+" : ""}${quantityChange}`,
        metadata: { quantityChange, newQuantity }
      });
    } catch (auditError) {
      console.error("Error recording inventory qty audit:", auditError);
    }
    revalidatePath("/inventory");
    revalidatePath("/pos");
    return { success: true, data: { ...updatedItem, status } };
  } catch (error) {
    console.error("Error updating inventory quantity:", error);
    return { success: false, error: "Failed to update inventory quantity" };
  }
}
async function createInventoryMovement(data) {
  const session = await verifySession();
  if (!session) return { success: false, error: "Unauthorized" };
  try {
    const movement = await db_default.inventoryMovement.create({
      data: {
        id: generateUUID(),
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        productName: data.productName,
        movementType: data.movementType,
        movementId: data.movementId || "MANUAL-" + Date.now(),
        quantityChange: data.quantityChange,
        previousQuantity: data.previousQuantity,
        newQuantity: data.newQuantity,
        userId: data.user,
        inventoryType: data.inventoryType
      }
    });
    return { success: true, data: movement };
  } catch (error) {
    console.error("Error creating inventory movement:", error);
    return { success: false, error: "Failed to create inventory movement" };
  }
}
async function getInventoryMovements() {
  const session = await verifySession();
  if (!session) return { success: false, error: "Unauthorized" };
  try {
    const movements = await db_default.inventoryMovement.findMany({
      include: {
        user: {
          select: {
            name: true,
            role: true
          }
        }
      },
      orderBy: {
        timestamp: "desc"
      },
      take: 100
    });
    return { success: true, data: movements };
  } catch (error) {
    console.error("Error fetching inventory movements:", error);
    return { success: false, error: "Failed to fetch inventory movements" };
  }
}
async function bulkImportInventory(data, mode = "create", fileName, userId) {
  const session = await verifySession();
  if (!session) return { success: false, error: "Unauthorized" };
  try {
    const results = {
      productsCreated: 0,
      productsUpdated: 0,
      inventoryItemsCreated: 0,
      errors: []
    };
    const settings = await db_default.systemSettings.findFirst();
    const exchangeRate = settings?.exchangeRate ? parseFloat(settings.exchangeRate) : 36.5;
    const importInDollars = settings?.importProductsInDollars === true;
    const priceMultiplier = importInDollars ? exchangeRate : 1;
    for (const item of data) {
      try {
        let categoryId = null;
        if (item.category) {
          let parentCat = await db_default.category.findFirst({
            where: {
              name: item.category,
              inventoryType: item.inventoryType,
              parentId: null
            }
          });
          if (!parentCat) {
            parentCat = await db_default.category.create({
              data: {
                id: generateUUID(),
                name: item.category,
                inventoryType: item.inventoryType,
                updatedAt: /* @__PURE__ */ new Date(),
                description: `Creado durante importaci\xF3n de ${item.inventoryType}`
              }
            });
          }
          categoryId = parentCat.id;
          if (item.subCategory) {
            let subCat = await db_default.category.findFirst({
              where: {
                name: item.subCategory,
                parentId: parentCat.id
              }
            });
            if (!subCat) {
              subCat = await db_default.category.create({
                data: {
                  id: generateUUID(),
                  name: item.subCategory,
                  inventoryType: item.inventoryType,
                  parentId: parentCat.id,
                  updatedAt: /* @__PURE__ */ new Date(),
                  description: `Subcategor\xEDa de ${item.category}`
                }
              });
            }
            categoryId = subCat.id;
          }
        }
        const productWhere = {
          name: item.productName.trim()
        };
        const normalizedSize = item.size && item.size.trim() && item.size.trim().toUpperCase() !== "NINGUNO" ? item.size.trim() : null;
        const normalizedColor = item.color && item.color.trim() && item.color.trim().toUpperCase() !== "NINGUNO" ? item.color.trim() : null;
        if (normalizedSize) {
          productWhere.size = normalizedSize;
        }
        if (normalizedColor) {
          productWhere.color = normalizedColor;
        }
        const finalPriceNIO = item.priceNIO * priceMultiplier;
        const finalCostPriceNIO = item.costPriceNIO * priceMultiplier;
        const shouldUseVariantStock = item.inventoryType === "general" && (!!normalizedSize || !!normalizedColor);
        if (shouldUseVariantStock) {
          const sizeName = normalizedSize || "UNICA";
          const colorName = normalizedColor || "UNICO";
          const [size, color] = await Promise.all([
            db_default.size.upsert({
              where: { name: sizeName.toUpperCase() },
              create: { id: generateUUID(), name: sizeName.toUpperCase(), order: 0 },
              update: { active: true }
            }),
            db_default.color.upsert({
              where: { name: colorName.toUpperCase() },
              create: { id: generateUUID(), name: colorName.toUpperCase() },
              update: { active: true }
            })
          ]);
          let product2 = await db_default.product.findFirst({
            where: {
              name: item.productName.trim(),
              brand: item.brand || null,
              category: item.subCategory ? `${item.category} > ${item.subCategory}` : item.category,
              inventoryType: item.inventoryType,
              hasVariants: true
            }
          });
          if (!product2) {
            product2 = await db_default.product.create({
              data: {
                id: generateUUID(),
                name: item.productName.trim(),
                priceNIO: finalPriceNIO,
                costPriceNIO: finalCostPriceNIO,
                category: item.subCategory ? `${item.category} > ${item.subCategory}` : item.category,
                inventoryType: item.inventoryType,
                unitOfMeasure: item.unitOfMeasure,
                minStock: item.minStock,
                barcode: null,
                imageUrl: null,
                imageHint: null,
                brand: item.brand || null,
                gender: item.gender || null,
                hasVariants: true,
                categoryRelation: categoryId ? { connect: { id: categoryId } } : void 0,
                purchaseCurrency: importInDollars ? "USD" : "NIO",
                originalPrice: item.priceNIO,
                price2: item.price2 || void 0,
                price3: item.price3 || void 0,
                price4: item.price4 || void 0,
                baseUnit: item.baseUnit || void 0,
                bulkUnit: item.bulkUnit || void 0,
                unitsPerBox: item.unitsPerBox || void 0,
                hasBoxOption: item.hasBoxOption || void 0,
                isFractional: item.isFractional || void 0
              }
            });
            results.productsCreated++;
          } else if (mode === "update") {
            await db_default.product.update({
              where: { id: product2.id },
              data: {
                priceNIO: finalPriceNIO,
                costPriceNIO: finalCostPriceNIO,
                minStock: item.minStock,
                brand: item.brand || product2.brand,
                gender: item.gender || product2.gender,
                categoryId: categoryId || product2.categoryId,
                price2: item.price2 || product2.price2,
                price3: item.price3 || product2.price3,
                price4: item.price4 || product2.price4,
                baseUnit: item.baseUnit || product2.baseUnit,
                bulkUnit: item.bulkUnit || product2.bulkUnit,
                unitsPerBox: item.unitsPerBox || product2.unitsPerBox,
                hasBoxOption: item.hasBoxOption !== void 0 ? item.hasBoxOption : product2.hasBoxOption,
                isFractional: item.isFractional !== void 0 ? item.isFractional : product2.isFractional
              }
            });
            results.productsUpdated++;
          }
          const existingVariant = await db_default.productVariant.findUnique({
            where: {
              productId_sizeId_colorId: {
                productId: product2.id,
                sizeId: size.id,
                colorId: color.id
              }
            }
          });
          const previousStock = existingVariant?.stock || 0;
          const variant = existingVariant ? await db_default.productVariant.update({
            where: { id: existingVariant.id },
            data: {
              barcode: item.barcode || existingVariant.barcode,
              cost: finalCostPriceNIO,
              price: finalPriceNIO,
              stock: mode === "update" ? item.quantity : { increment: item.quantity },
              active: true
            }
          }) : await db_default.productVariant.create({
            data: {
              id: generateUUID(),
              productId: product2.id,
              sizeId: size.id,
              colorId: color.id,
              barcode: item.barcode || null,
              cost: finalCostPriceNIO,
              price: finalPriceNIO,
              stock: item.quantity,
              active: true
            }
          });
          results.inventoryItemsCreated++;
          if (item.quantity > 0 || mode === "update") {
            await db_default.inventoryMovement.create({
              data: {
                id: generateUUID(),
                timestamp: (/* @__PURE__ */ new Date()).toISOString(),
                productName: `${product2.name} - ${size.name} - ${color.name}`,
                movementType: mode === "update" ? "Ajuste" : "Entrada",
                movementId: `IMPORT-${Date.now()}-${results.inventoryItemsCreated}`,
                quantityChange: mode === "update" ? variant.stock - previousStock : item.quantity,
                previousQuantity: previousStock,
                newQuantity: variant.stock,
                userId: userId || session.userId,
                inventoryType: item.inventoryType
              }
            });
          }
          continue;
        }
        let product = await db_default.product.findFirst({
          where: productWhere
        });
        if (!product) {
          product = await db_default.product.create({
            data: {
              id: generateUUID(),
              name: item.productName.trim(),
              priceNIO: finalPriceNIO,
              costPriceNIO: finalCostPriceNIO,
              category: item.subCategory ? `${item.category} > ${item.subCategory}` : item.category,
              inventoryType: item.inventoryType,
              unitOfMeasure: item.unitOfMeasure,
              minStock: item.minStock,
              barcode: item.barcode || null,
              imageUrl: null,
              imageHint: null,
              brand: item.brand || null,
              size: normalizedSize,
              color: normalizedColor,
              gender: item.gender || null,
              categoryRelation: categoryId ? { connect: { id: categoryId } } : void 0,
              purchaseCurrency: importInDollars ? "USD" : "NIO",
              originalPrice: item.priceNIO,
              price2: item.price2 || void 0,
              price3: item.price3 || void 0,
              price4: item.price4 || void 0,
              baseUnit: item.baseUnit || void 0,
              bulkUnit: item.bulkUnit || void 0,
              unitsPerBox: item.unitsPerBox || void 0,
              hasBoxOption: item.hasBoxOption || void 0,
              isFractional: item.isFractional || void 0
            }
          });
          results.productsCreated++;
        } else if (mode === "update") {
          await db_default.product.update({
            where: { id: product.id },
            data: {
              priceNIO: finalPriceNIO,
              costPriceNIO: finalCostPriceNIO,
              category: item.subCategory ? `${item.category} > ${item.subCategory}` : item.category,
              minStock: item.minStock,
              barcode: item.barcode || product.barcode,
              brand: item.brand || product.brand,
              size: normalizedSize || product.size,
              color: normalizedColor || product.color,
              gender: item.gender || product.gender,
              categoryId: categoryId || product.categoryId,
              price2: item.price2 || product.price2,
              price3: item.price3 || product.price3,
              price4: item.price4 || product.price4,
              baseUnit: item.baseUnit || product.baseUnit,
              bulkUnit: item.bulkUnit || product.bulkUnit,
              unitsPerBox: item.unitsPerBox || product.unitsPerBox,
              hasBoxOption: item.hasBoxOption !== void 0 ? item.hasBoxOption : product.hasBoxOption,
              isFractional: item.isFractional !== void 0 ? item.isFractional : product.isFractional
            }
          });
          results.productsUpdated++;
        }
        let status = "En Stock";
        if (item.quantity === 0) {
          status = "Agotado";
        } else if (item.quantity < item.minStock) {
          status = "Stock Bajo";
        }
        const invItem = await db_default.inventoryItem.create({
          data: {
            id: generateUUID(),
            productId: product.id,
            productName: item.productName,
            barcode: item.barcode || null,
            inventoryType: item.inventoryType,
            batch: item.batch,
            quantity: item.quantity,
            expiryDate: item.expiryDate,
            status
          }
        });
        results.inventoryItemsCreated++;
        if (item.quantity > 0) {
          const currentStockRecords = await db_default.inventoryItem.findMany({
            where: { productId: product.id }
          });
          const currentTotal = currentStockRecords.reduce((sum, i) => sum + i.quantity, 0);
          const previousTotal = currentTotal - item.quantity;
          await db_default.inventoryMovement.create({
            data: {
              id: generateUUID(),
              timestamp: (/* @__PURE__ */ new Date()).toISOString(),
              productName: item.productName,
              movementType: "Entrada",
              movementId: `IMPORT-${Date.now()}-${results.inventoryItemsCreated}`,
              quantityChange: item.quantity,
              previousQuantity: previousTotal,
              newQuantity: currentTotal,
              userId: userId || session.userId,
              inventoryType: item.inventoryType
            }
          });
        }
      } catch (itemError) {
        console.error(`Error processing item ${item.productName}:`, itemError);
        results.errors.push(`Error en ${item.productName}: ${itemError instanceof Error ? itemError.message : "Error desconocido"}`);
      }
    }
    if (userId) {
      try {
        await db_default.importHistory.create({
          data: {
            id: generateUUID(),
            fileName: fileName || "import.xlsx",
            importedBy: userId,
            mode,
            totalRows: data.length,
            successfulRows: data.length - results.errors.length,
            failedRows: results.errors.length,
            productsCreated: results.productsCreated,
            productsUpdated: results.productsUpdated,
            inventoryItemsCreated: results.inventoryItemsCreated,
            errors: JSON.stringify(results.errors),
            summary: JSON.stringify({
              timestamp: (/* @__PURE__ */ new Date()).toISOString(),
              mode,
              stats: results
            })
          }
        });
      } catch (historyError) {
        console.error("Error saving import history:", historyError);
      }
    }
    revalidatePath("/inventory");
    revalidatePath("/pos");
    revalidatePath("/kardex");
    revalidatePath("/inventory/import-history");
    return { success: true, data: results };
  } catch (error) {
    console.error("Error in bulk import:", error);
    return { success: false, error: "Failed to import inventory" };
  }
}

// src/lib/actions/jewelry-materials.ts
var jewelry_materials_exports = {};
__export(jewelry_materials_exports, {
  createJewelryMaterial: () => createJewelryMaterial,
  deleteJewelryMaterial: () => deleteJewelryMaterial,
  getJewelryMaterials: () => getJewelryMaterials,
  updateJewelryMaterial: () => updateJewelryMaterial
});
init_db();
async function getJewelryMaterials() {
  try {
    const materials = await db_default.jewelryMaterial.findMany({
      orderBy: { name: "asc" }
    });
    return { success: true, data: materials };
  } catch (error) {
    console.error("Error fetching jewelry materials:", error);
    return { success: false, error: "Error al obtener materiales de joyer\xEDa" };
  }
}
async function createJewelryMaterial(name) {
  try {
    const material = await db_default.jewelryMaterial.create({
      data: { name }
    });
    revalidatePath("/jewelry/inventory");
    revalidatePath("/jewelry/production");
    revalidatePath("/settings");
    return { success: true, data: material };
  } catch (error) {
    console.error("Error creating jewelry material:", error);
    if (error.code === "P2002") {
      return { success: false, error: "Este material ya existe" };
    }
    return { success: false, error: "Error al crear material" };
  }
}
async function updateJewelryMaterial(id, name) {
  try {
    const material = await db_default.jewelryMaterial.update({
      where: { id },
      data: { name }
    });
    revalidatePath("/jewelry/inventory");
    revalidatePath("/jewelry/production");
    revalidatePath("/settings");
    return { success: true, data: material };
  } catch (error) {
    console.error("Error updating jewelry material:", error);
    if (error.code === "P2002") {
      return { success: false, error: "Ese nombre ya existe" };
    }
    return { success: false, error: "Error al actualizar material" };
  }
}
async function deleteJewelryMaterial(id) {
  try {
    await db_default.jewelryMaterial.delete({
      where: { id }
    });
    revalidatePath("/jewelry/inventory");
    revalidatePath("/jewelry/production");
    revalidatePath("/settings");
    return { success: true };
  } catch (error) {
    console.error("Error deleting jewelry material:", error);
    return { success: false, error: "Error al eliminar material. Aseg\xFArese que no est\xE9 en uso." };
  }
}

// src/lib/actions/jewelry-production.ts
var jewelry_production_exports = {};
__export(jewelry_production_exports, {
  addJewelryToInventory: () => addJewelryToInventory,
  createJewelryPiece: () => createJewelryPiece,
  deleteJewelryPiece: () => deleteJewelryPiece,
  exportJewelryCsv: () => exportJewelryCsv,
  getAvailableJewelry: () => getAvailableJewelry,
  getGoldStock: () => getGoldStock,
  importJewelryCsv: () => importJewelryCsv,
  transferJewelryPiece: () => transferJewelryPiece,
  updateJewelryPiece: () => updateJewelryPiece
});
init_db();
init_jewelry_production_service();
async function createJewelryPiece(input) {
  try {
    const pieces = await db_default.$transaction(async (tx) => {
      return await JewelryProductionService.transform(tx, input);
    });
    for (const piece of pieces) {
      await createInventoryMovement({
        productId: piece.id,
        productName: `${piece.name} (${piece.code || piece.id.slice(-6)})`,
        movementType: "Entrada",
        quantityChange: 1,
        previousQuantity: 0,
        newQuantity: 1,
        user: input.userId,
        inventoryType: "jewelry",
        movementId: piece.id
      });
    }
    revalidatePath("/jewelry/inventory");
    revalidatePath("/jewelry/production");
    revalidatePath("/jewelry/sales");
    revalidatePath("/kardex");
    return { success: true, data: pieces };
  } catch (error) {
    console.error("Error creating jewelry piece:", error);
    return { success: false, error: error.message || "Error al transformar el oro" };
  }
}
async function addJewelryToInventory(input) {
  try {
    const pieces = await db_default.$transaction(async (tx) => {
      return await JewelryProductionService.directEntry(tx, input);
    });
    for (const piece of pieces) {
      await createInventoryMovement({
        productId: piece.id,
        productName: `${piece.name} (${piece.code || piece.id.slice(-6)})`,
        movementType: "Entrada",
        quantityChange: 1,
        previousQuantity: 0,
        newQuantity: 1,
        user: input.userId,
        inventoryType: "jewelry",
        movementId: piece.id
      });
    }
    revalidatePath("/jewelry/inventory");
    revalidatePath("/jewelry/production");
    revalidatePath("/jewelry/sales");
    revalidatePath("/kardex");
    return { success: true, data: pieces };
  } catch (error) {
    console.error("Error adding jewelry to inventory:", error);
    return { success: false, error: error.message || "Error al ingresar piezas al inventario" };
  }
}
async function getAvailableJewelry() {
  try {
    const [settings, allAvailablePieces] = await Promise.all([
      db_default.systemSettings.findFirst(),
      db_default.jewelryPiece.findMany({
        where: { status: "AVAILABLE" },
        orderBy: { createdAt: "desc" }
      })
    ]);
    const mode = settings?.jewelryLocationMode || "HOME";
    let filteredPieces = allAvailablePieces;
    if (mode === "STORE_A") {
      filteredPieces = allAvailablePieces.filter((p) => p.location === "A");
    } else if (mode === "STORE_B") {
      filteredPieces = allAvailablePieces.filter((p) => p.location === "B");
    }
    return { success: true, data: filteredPieces };
  } catch (error) {
    console.error("Error fetching available jewelry:", error);
    return { success: false, error: "Error al obtener inventario de piezas" };
  }
}
async function getGoldStock() {
  try {
    const stocks = await db_default.goldStock.findMany({
      orderBy: { karat: "desc" }
    });
    return { success: true, data: stocks };
  } catch (error) {
    console.error("Error fetching gold stock:", error);
    return { success: false, error: "Error al obtener stock de oro" };
  }
}
async function updateJewelryPiece(id, input) {
  try {
    const data = {};
    if (input.code !== void 0) data.code = input.code;
    if (input.name !== void 0) data.name = input.name;
    if (input.weight !== void 0) data.weight = input.weight;
    if (input.karat !== void 0) data.karat = input.karat;
    if (input.laborCost !== void 0) data.laborCost = input.laborCost;
    if (input.marginPercent !== void 0) data.marginPercent = input.marginPercent;
    if (input.calculatedPrice !== void 0) data.calculatedPrice = input.calculatedPrice;
    if (input.profitAmount !== void 0) data.profitAmount = input.profitAmount;
    if (input.photoUrl !== void 0) data.photoUrl = input.photoUrl;
    if (input.materialId !== void 0) data.materialId = input.materialId;
    const piece = await db_default.jewelryPiece.update({
      where: { id },
      data
    });
    revalidatePath("/jewelry/inventory");
    revalidatePath("/jewelry/production");
    revalidatePath("/jewelry/sales");
    return { success: true, data: piece };
  } catch (error) {
    console.error("Error updating jewelry piece:", error);
    return { success: false, error: error.message || "Error al actualizar la pieza" };
  }
}
async function deleteJewelryPiece(id, password) {
  const session = await verifySession();
  if (!session || session.role !== "master-admin" && session.role !== "admin") {
    return { success: false, error: "Acceso no autorizado" };
  }
  try {
    const settings = await db_default.systemSettings.findFirst();
    if (!settings || settings.recoveryKey !== password) {
      return { success: false, error: "Llave Maestra incorrecta" };
    }
    const pieceToDelete = await db_default.jewelryPiece.findUnique({
      where: { id },
      select: { code: true }
    });
    if (!pieceToDelete) {
      return { success: false, error: "La pieza no existe" };
    }
    await db_default.$transaction(async (tx) => {
      await tx.jewelryPiece.delete({
        where: { id }
      });
      if (pieceToDelete.code && !isNaN(Number(pieceToDelete.code))) {
        const deletedNum = Number(pieceToDelete.code);
        const piecesToShift = await tx.jewelryPiece.findMany({
          where: {
            code: {
              gt: pieceToDelete.code
            }
          },
          orderBy: {
            code: "asc"
          }
        });
        for (const piece of piecesToShift) {
          if (piece.code && !isNaN(Number(piece.code))) {
            const currentNum = Number(piece.code);
            await tx.jewelryPiece.update({
              where: { id: piece.id },
              data: {
                code: (currentNum - 1).toString()
              }
            });
          }
        }
      }
    });
    revalidatePath("/jewelry/inventory");
    revalidatePath("/jewelry/production");
    revalidatePath("/jewelry/sales");
    return { success: true };
  } catch (error) {
    console.error("Error deleting jewelry piece:", error);
    return { success: false, error: error.message || "Error al eliminar la pieza" };
  }
}
async function transferJewelryPiece(id, newLocation) {
  const session = await verifySession();
  if (!session) {
    return { success: false, error: "No autorizado" };
  }
  try {
    const piece = await db_default.jewelryPiece.findUnique({ where: { id } });
    if (!piece) return { success: false, error: "Pieza no encontrada" };
    if (piece.location === newLocation) return { success: false, error: "La pieza ya est\xE1 en esta ubicaci\xF3n" };
    await db_default.jewelryPiece.update({
      where: { id },
      data: { location: newLocation }
    });
    revalidatePath("/jewelry/inventory");
    revalidatePath("/jewelry/production");
    revalidatePath("/jewelry/sales");
    return { success: true };
  } catch (error) {
    console.error("Error transferring jewelry piece:", error);
    return { success: false, error: error.message || "Error al transferir la pieza" };
  }
}
async function exportJewelryCsv(location) {
  const session = await verifySession();
  if (!session) return { success: false, error: "No autorizado" };
  try {
    const pieces = await db_default.jewelryPiece.findMany({
      where: { location },
      orderBy: { code: "asc" }
    });
    const headers = ["ID", "Code", "Name", "Weight", "Karat", "LaborCost", "MarginPercent", "CalculatedPrice", "ProfitAmount", "Location", "Status"];
    const rows = pieces.map((p) => [
      p.id,
      p.code || "",
      `"${p.name.replace(/"/g, '""')}"`,
      // escape quotes
      p.weight.toString(),
      p.karat.toString(),
      p.laborCost.toString(),
      p.marginPercent.toString(),
      p.calculatedPrice.toString(),
      (p.profitAmount || 0).toString(),
      p.location,
      p.status
    ].join(","));
    const csvContent = [headers.join(","), ...rows].join("\n");
    return { success: true, data: csvContent };
  } catch (error) {
    console.error("Error exporting CSV:", error);
    return { success: false, error: "Error al generar CSV" };
  }
}
async function importJewelryCsv(csvText, targetLocation) {
  const session = await verifySession();
  if (!session || session.role !== "master-admin" && session.role !== "admin") {
    return { success: false, error: "No autorizado" };
  }
  try {
    const lines = csvText.split(/\r?\n/).filter((line) => line.trim() !== "");
    if (lines.length < 2) return { success: false, error: "CSV vac\xEDo o sin suficientes datos" };
    const headers = lines[0].split(",");
    const piecesToCreate = [];
    for (let i = 1; i < lines.length; i++) {
      const row = lines[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
      if (!row) continue;
      const cleanRow = row.map((col) => col.replace(/^"|"$/g, "").replace(/""/g, '"'));
      const [id, code, name, weightStr, karatStr, laborStr, marginStr, calcPriceStr, profitStr] = cleanRow;
      piecesToCreate.push({
        name: name || "Joya Importada",
        weight: parseFloat(weightStr) || 0,
        karat: parseInt(karatStr, 10) || 18,
        laborCost: parseFloat(laborStr) || 0,
        marginPercent: parseFloat(marginStr) || 25,
        calculatedPrice: parseFloat(calcPriceStr) || 0,
        profitAmount: parseFloat(profitStr) || 0,
        marketPriceUsed: 0,
        status: "AVAILABLE",
        location: targetLocation
      });
    }
    if (piecesToCreate.length === 0) {
      return { success: false, error: "No se encontraron joyas v\xE1lidas en el CSV" };
    }
    const { JewelryProductionService: JewelryProductionService2 } = await Promise.resolve().then(() => (init_jewelry_production_service(), jewelry_production_service_exports));
    let importedCount = 0;
    await db_default.$transaction(async (tx) => {
      for (const pieceData of piecesToCreate) {
        await JewelryProductionService2.directEntry(tx, {
          userId: session.userId || "",
          name: pieceData.name,
          karat: pieceData.karat,
          weight: pieceData.weight,
          laborCost: pieceData.laborCost,
          marginPercent: pieceData.marginPercent,
          calculatedPrice: pieceData.calculatedPrice,
          profitAmount: pieceData.profitAmount,
          location: pieceData.location
          // photoUrl and materialId are skipped in basic CSV for simplicity
        });
        importedCount++;
      }
    });
    revalidatePath("/jewelry/inventory");
    revalidatePath("/jewelry/production");
    return { success: true, count: importedCount };
  } catch (error) {
    console.error("Error importing CSV:", error);
    return { success: false, error: error.message || "Error al procesar el archivo CSV" };
  }
}

// src/lib/actions/jewelry-reports.ts
var jewelry_reports_exports = {};
__export(jewelry_reports_exports, {
  getJewelryDetailedInventory: () => getJewelryDetailedInventory,
  getJewelryInventoryStats: () => getJewelryInventoryStats,
  getJewelrySalesStats: () => getJewelrySalesStats,
  getJewelrySessionSummary: () => getJewelrySessionSummary,
  getJewelryTopSellingPieces: () => getJewelryTopSellingPieces,
  getTodayJewelrySalesDetail: () => getTodayJewelrySalesDetail
});
init_db();
async function getJewelryInventoryStats() {
  try {
    const pieces = await db_default.jewelryPiece.findMany({
      where: { status: "AVAILABLE" },
      include: { jewelryMaterial: true }
    });
    const materialMap = /* @__PURE__ */ new Map();
    const settings = await db_default.systemSettings.findFirst();
    const rate = parseFloat(settings?.exchangeRate || "36.5");
    pieces.forEach((p) => {
      const mName = p.jewelryMaterial?.name || "Otros";
      const current = materialMap.get(mName) || { count: 0, valueUSD: 0, weight: 0 };
      materialMap.set(mName, {
        count: current.count + 1,
        valueUSD: current.valueUSD + p.calculatedPrice / rate,
        weight: current.weight + p.weight
      });
    });
    const stats = Array.from(materialMap.entries()).map(([name, data]) => ({
      name,
      ...data
    }));
    return { success: true, data: stats };
  } catch (error) {
    console.error("Error in getJewelryInventoryStats:", error);
    return { success: false, error: "Error al obtener estad\xEDsticas de inventario" };
  }
}
async function getJewelrySalesStats(startDate, endDate) {
  try {
    const where = { status: "SOLD" };
    if (startDate && endDate) {
      where.createdAt = { gte: startDate, lte: endDate };
    }
    const sales = await db_default.jewelryPiece.findMany({
      where,
      include: { jewelryMaterial: true }
    });
    const settings = await db_default.systemSettings.findFirst();
    const rate = parseFloat(settings?.exchangeRate || "36.5");
    const chartMap = /* @__PURE__ */ new Map();
    sales.forEach((s) => {
      const day = s.createdAt.toISOString().split("T")[0];
      chartMap.set(day, (chartMap.get(day) || 0) + s.calculatedPrice);
    });
    const chartData = Array.from(chartMap.entries()).map(([date, amount]) => ({ date, amount }));
    const materialMap = /* @__PURE__ */ new Map();
    sales.forEach((s) => {
      const mName = s.jewelryMaterial?.name || "Desconocido";
      materialMap.set(mName, (materialMap.get(mName) || 0) + s.calculatedPrice);
    });
    const materialData = Array.from(materialMap.entries()).map(([name, revenue]) => ({ name, revenue }));
    const totalRevenueC$ = sales.reduce((sum, s) => sum + s.calculatedPrice, 0);
    return {
      success: true,
      chartData,
      materialData,
      totalRevenue: totalRevenueC$ / rate,
      // USD expected by component
      totalCount: sales.length
    };
  } catch (error) {
    console.error("Error in getJewelrySalesStats:", error);
    return { success: false, error: "Error al obtener estad\xEDsticas de ventas" };
  }
}
async function getJewelryDetailedInventory() {
  try {
    const pieces = await db_default.jewelryPiece.findMany({
      where: { status: "AVAILABLE" },
      include: { jewelryMaterial: true },
      orderBy: { createdAt: "desc" }
    });
    const materialMap = /* @__PURE__ */ new Map();
    pieces.forEach((p) => {
      const mName = p.jewelryMaterial?.name || "Otros / Sin Categor\xEDa";
      if (!materialMap.has(mName)) materialMap.set(mName, []);
      materialMap.get(mName).push(p);
    });
    const detailed = Array.from(materialMap.entries()).map(([materialName, pieces2]) => ({
      materialName,
      pieces: pieces2
    }));
    return { success: true, data: detailed };
  } catch (error) {
    console.error("Error in getJewelryDetailedInventory:", error);
    return { success: false, error: "Error al obtener inventario detallado" };
  }
}
async function getJewelryTopSellingPieces(startDate, endDate) {
  try {
    const where = { status: "SOLD" };
    if (startDate && endDate) {
      where.createdAt = { gte: startDate, lte: endDate };
    }
    const pieces = await db_default.jewelryPiece.findMany({
      where,
      orderBy: { calculatedPrice: "desc" },
      take: 10
    });
    const settings = await db_default.systemSettings.findFirst();
    const rate = parseFloat(settings?.exchangeRate || "36.5");
    const topSelling = pieces.map((p) => ({
      count: 1,
      revenue: p.calculatedPrice / rate,
      // USD
      name: p.name,
      code: p.code || p.id.slice(-6)
    }));
    return { success: true, data: topSelling };
  } catch (error) {
    console.error("Error in getJewelryTopSellingPieces:", error);
    return { success: false, error: "Error al obtener piezas m\xE1s vendidas" };
  }
}
async function getTodayJewelrySalesDetail(sessionId) {
  try {
    const invoices = await db_default.salesInvoice.findMany({
      where: { sessionId },
      include: {
        salesInvoiceItem: true,
        user: true
      },
      orderBy: { date: "desc" }
    });
    const salesDetails = [];
    const pieceIds = invoices.flatMap((inv) => inv.salesInvoiceItem.map((item) => item.productId));
    const pieces = await db_default.jewelryPiece.findMany({
      where: {
        id: { in: pieceIds }
      }
    });
    const piecesMap = new Map(pieces.map((p) => [p.id, p]));
    for (const invoice of invoices) {
      for (const item of invoice.salesInvoiceItem) {
        const piece = piecesMap.get(item.productId);
        if (piece) {
          salesDetails.push({
            id: `${invoice.id}-${piece.id}`,
            pieceId: piece.id,
            pieceName: piece.name,
            pieceCode: piece.code || piece.id.slice(-6).toUpperCase(),
            amount: item.totalPrice,
            description: `Venta Factura #${invoice.invoiceNumber}`,
            createdAt: invoice.date,
            karat: piece.karat,
            weight: piece.weight,
            invoiceNumber: invoice.invoiceNumber
          });
        }
      }
    }
    return { success: true, data: salesDetails };
  } catch (error) {
    console.error("Error fetching jewelry sales detail:", error);
    return { success: false, error: "Error al obtener el detalle de ventas" };
  }
}
async function getJewelrySessionSummary(sessionId) {
  try {
    const session = await db_default.cashRegisterSession.findUnique({
      where: { id: sessionId },
      include: {
        user: true
      }
    });
    if (!session) return { success: false, error: "Sesi\xF3n no encontrada" };
    return {
      success: true,
      data: {
        initialAmount: session.initialAmount,
        totalSales: session.totalSales || 0,
        salesCash: session.salesCash || 0,
        salesCard: session.salesCard || 0,
        salesUSD: session.salesUSD || 0,
        cashierName: session.cashierName,
        openingTime: session.openingTime,
        status: session.status
      }
    };
  } catch (error) {
    return { success: false, error: "Error al obtener el resumen de la sesi\xF3n" };
  }
}

// src/lib/actions/jewelry-sales.ts
var jewelry_sales_exports = {};
__export(jewelry_sales_exports, {
  getJewelrySalesHistory: () => getJewelrySalesHistory,
  sellJewelryPiece: () => sellJewelryPiece,
  sellMultipleJewelryPieces: () => sellMultipleJewelryPieces
});
init_db();

// src/lib/services/jewelry-sales-service.ts
var JewelrySalesService = class {
  /**
   * Finalizes the sale of a jewelry piece.
   */
  static async sell(tx, data) {
    const piece = await tx.jewelryPiece.findUnique({
      where: { id: data.pieceId }
    });
    if (!piece || piece.status !== "AVAILABLE") {
      throw new Error("La pieza no est\xE1 disponible para la venta.");
    }
    const updatedPiece = await tx.jewelryPiece.update({
      where: { id: data.pieceId },
      data: { status: "SOLD" }
    });
    await FinancialService.record(tx, {
      type: "INCOME",
      amount: data.salePrice,
      referenceId: piece.id,
      description: `Venta de pieza: ${piece.name} a cliente ID: ${data.customerId}`
    });
    if (!data.sessionId) {
      throw new Error("Se requiere una sesi\xF3n de caja activa para procesar la venta.");
    }
    const settings = await tx.systemSettings.findFirst();
    const exchangeRate = parseFloat(settings?.exchangeRate || "36.5");
    const amountInNio = Math.round(data.salePrice * exchangeRate * 100) / 100;
    const updateData = {
      totalSales: { increment: amountInNio }
    };
    const pm = data.paymentMethod.toLowerCase();
    if (pm === "efectivo $") {
      updateData.salesUSD = { increment: data.salePrice };
    } else if (pm === "efectivo c$") {
      updateData.salesCash = { increment: amountInNio };
    } else if (pm.includes("tarjeta")) {
      updateData.salesCard = { increment: amountInNio };
    } else {
      updateData.salesCash = { increment: amountInNio };
    }
    await tx.cashRegisterSession.update({
      where: { id: data.sessionId },
      data: updateData
    });
    const invoice = await tx.salesInvoice.create({
      data: {
        totalAmount: amountInNio,
        // Guardar en NIO para reportes consistentes
        paymentMethod: data.paymentMethod,
        status: "COMPLETED",
        sessionId: data.sessionId,
        userId: data.userId,
        customerId: data.customerId,
        items: {
          create: [{
            productId: piece.id,
            productName: piece.name,
            quantity: 1,
            unitPrice: amountInNio,
            totalPrice: amountInNio,
            priceLevel: 0
          }]
        }
      }
    });
    await tx.auditLog.create({
      data: {
        userId: data.userId,
        action: "JEWELRY_SALE",
        entity: "JewelryPiece",
        entityId: piece.id
      }
    });
    return { piece: updatedPiece, invoiceNumber: invoice.invoiceNumber };
  }
  /**
   * Finalizes the sale of multiple jewelry pieces.
   */
  static async sellMultiple(tx, data) {
    if (data.cartItems.length === 0) {
      throw new Error("No hay piezas para facturar.");
    }
    const pieceIds = data.cartItems.map((item) => item.pieceId);
    const pieces = await tx.jewelryPiece.findMany({
      where: { id: { in: pieceIds } }
    });
    if (pieces.length !== pieceIds.length) {
      throw new Error("Una o m\xE1s piezas no fueron encontradas.");
    }
    const unavailablePieces = pieces.filter((p) => p.status !== "AVAILABLE");
    if (unavailablePieces.length > 0) {
      throw new Error(`Las siguientes piezas no est\xE1n disponibles: ${unavailablePieces.map((p) => p.name).join(", ")}`);
    }
    await tx.jewelryPiece.updateMany({
      where: { id: { in: pieceIds } },
      data: { status: "SOLD" }
    });
    await FinancialService.record(tx, {
      type: "INCOME",
      amount: data.totalSalePrice,
      referenceId: `MULTIPLE-${Date.now()}`,
      description: `Venta de ${pieces.length} piezas a cliente ID: ${data.customerId}`
    });
    if (!data.sessionId) {
      throw new Error("Se requiere una sesi\xF3n de caja activa para procesar la venta.");
    }
    const settings = await tx.systemSettings.findFirst();
    const exchangeRate = parseFloat(settings?.exchangeRate || "36.5");
    const amountInNio = Math.round(data.totalSalePrice * exchangeRate * 100) / 100;
    const updateData = {
      totalSales: { increment: amountInNio }
    };
    const pm = data.paymentMethod.toLowerCase();
    if (pm === "efectivo $") {
      updateData.salesUSD = { increment: data.totalSalePrice };
    } else if (pm === "efectivo c$") {
      updateData.salesCash = { increment: amountInNio };
    } else if (pm.includes("tarjeta")) {
      updateData.salesCard = { increment: amountInNio };
    } else {
      updateData.salesCash = { increment: amountInNio };
    }
    await tx.cashRegisterSession.update({
      where: { id: data.sessionId },
      data: updateData
    });
    const invoiceItems = pieces.map((piece) => {
      const cartItem = data.cartItems.find((item) => item.pieceId === piece.id);
      const itemPriceUSD = cartItem ? cartItem.salePrice : piece.calculatedPrice;
      const itemPriceNIO = Math.round(itemPriceUSD * exchangeRate * 100) / 100;
      return {
        productId: piece.id,
        productName: piece.name,
        quantity: 1,
        unitPrice: itemPriceNIO,
        totalPrice: itemPriceNIO,
        priceLevel: 0
      };
    });
    const invoice = await tx.salesInvoice.create({
      data: {
        totalAmount: amountInNio,
        // Guardar en NIO
        paymentMethod: data.paymentMethod,
        status: "COMPLETED",
        sessionId: data.sessionId,
        userId: data.userId,
        customerId: data.customerId,
        items: {
          create: invoiceItems
        }
      }
    });
    const auditLogs = pieces.map((piece) => ({
      userId: data.userId,
      action: "JEWELRY_SALE",
      entity: "JewelryPiece",
      entityId: piece.id
    }));
    await tx.auditLog.createMany({ data: auditLogs });
    return { pieces, invoiceNumber: invoice.invoiceNumber };
  }
};

// src/lib/actions/jewelry-sales.ts
async function sellJewelryPiece(input) {
  try {
    const piece = await db_default.jewelryPiece.findUnique({ where: { id: input.pieceId } });
    const result = await db_default.$transaction(async (tx) => {
      return await JewelrySalesService.sell(tx, input);
    });
    if (piece) {
      await createInventoryMovement({
        productId: piece.id,
        productName: `${piece.name} (${piece.code || piece.id.slice(-6)})`,
        movementType: "Venta",
        quantityChange: -1,
        previousQuantity: 1,
        newQuantity: 0,
        user: input.userId,
        inventoryType: "jewelry",
        movementId: piece.id
      });
    }
    revalidatePath("/jewelry/inventory");
    revalidatePath("/jewelry/sales");
    revalidatePath("/dashboard");
    revalidatePath("/kardex");
    return {
      success: true,
      data: result.piece,
      invoiceNumber: result.invoiceNumber
    };
  } catch (error) {
    console.error("Error selling jewelry piece:", error);
    return { success: false, error: error.message || "Error al procesar la venta" };
  }
}
async function sellMultipleJewelryPieces(input) {
  try {
    const result = await db_default.$transaction(async (tx) => {
      return await JewelrySalesService.sellMultiple(tx, input);
    });
    const pieces = result.pieces;
    for (const piece of pieces) {
      await createInventoryMovement({
        productId: piece.id,
        productName: `${piece.name} (${piece.code || piece.id.slice(-6)})`,
        movementType: "Venta",
        quantityChange: -1,
        previousQuantity: 1,
        newQuantity: 0,
        user: input.userId,
        inventoryType: "jewelry",
        movementId: piece.id
      });
    }
    revalidatePath("/jewelry/inventory");
    revalidatePath("/jewelry/sales");
    revalidatePath("/dashboard");
    revalidatePath("/kardex");
    return {
      success: true,
      data: result.pieces,
      invoiceNumber: result.invoiceNumber
    };
  } catch (error) {
    console.error("Error selling jewelry pieces:", error);
    return { success: false, error: error.message || "Error al procesar la venta" };
  }
}
async function getJewelrySalesHistory(limit = 10) {
  try {
    const history = await db_default.jewelryPiece.findMany({
      where: { status: "SOLD" },
      orderBy: { createdAt: "desc" },
      take: limit
    });
    return { success: true, data: history };
  } catch (error) {
    return { success: false, error: "Error al obtener historial de ventas" };
  }
}

// src/lib/actions/jewelry-services.ts
var jewelry_services_exports = {};
__export(jewelry_services_exports, {
  createJewelryService: () => createJewelryService,
  getSessionServices: () => getSessionServices
});
init_db();
async function createJewelryService(sessionId, userId, description, amount) {
  const session = await verifySession();
  if (!session) return { success: false, error: "No autorizado" };
  if (!description.trim()) return { success: false, error: "El nombre del servicio es obligatorio." };
  if (amount <= 0) return { success: false, error: "El precio debe ser mayor a 0." };
  try {
    await db_default.$transaction(async (tx) => {
      await tx.jewelryService.create({
        data: {
          sessionId,
          userId,
          description: description.trim(),
          amount
        }
      });
      await tx.cashRegisterSession.update({
        where: { id: sessionId },
        data: {
          totalSales: { increment: amount },
          salesCash: { increment: amount },
          // Siempre efectivo
          salesServices: { increment: amount }
        }
      });
    });
    revalidatePath("/pos");
    revalidatePath("/cash-register/close");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    console.error("Error creating jewelry service:", error);
    return { success: false, error: "Error al registrar el servicio." };
  }
}
async function getSessionServices(sessionId) {
  const session = await verifySession();
  if (!session) return [];
  const services = await db_default.jewelryService.findMany({
    where: { sessionId },
    orderBy: { createdAt: "desc" }
  });
  return services.map((s) => ({
    id: s.id,
    description: s.description,
    amount: s.amount,
    createdAt: s.createdAt
  }));
}

// src/lib/actions/jewelry.ts
var jewelry_exports = {};
__export(jewelry_exports, {
  createJewelryPiece: () => createJewelryPiece2,
  revertJewelrySale: () => revertJewelrySale,
  sellJewelryPiece: () => sellJewelryPiece2
});
init_db();
async function createJewelryPiece2(name, weight, karat, laborCost, margin, currentGoldPrice, userId, photoUrl, consumeFromStock = true) {
  await BusinessGuard.assertMode("JEWELRY");
  const params = { weight, karat, laborCost, margin, currentGoldPrice };
  const calculatedPrice = JewelryPricingEngine.calculatePiecePrice(params);
  return await db_default.$transaction(async (tx) => {
    if (consumeFromStock) {
      const stock = await tx.goldStock.findUnique({ where: { karat } });
      if (!stock || stock.gramsAvailable < weight) {
        throw new Error(`No hay suficiente stock de oro de ${karat}k para crear la pieza (${stock?.gramsAvailable || 0}g disponibles, ${weight}g requeridos).`);
      }
      await tx.goldStock.update({
        where: { karat },
        data: { gramsAvailable: { decrement: weight } }
      });
    }
    const piece = await tx.jewelryPiece.create({
      data: {
        id: generateUUID(),
        name,
        weight,
        karat,
        laborCost,
        marginPercent: margin,
        calculatedPrice,
        marketPriceUsed: currentGoldPrice,
        photoUrl,
        status: "AVAILABLE"
      }
    });
    await tx.auditLog.create({
      data: {
        id: generateUUID(),
        userId,
        action: "JEWELRY_PIECE_CREATED",
        entity: "JewelryPiece",
        entityId: piece.id
      }
    });
    return piece;
  });
}
async function sellJewelryPiece2(pieceId, customerId, finalPrice, userId) {
  await BusinessGuard.assertMode("JEWELRY");
  return await db_default.$transaction(async (tx) => {
    const settings = await tx.systemSettings.findFirst();
    const rate = parseFloat(settings?.exchangeRate || "36.5");
    const finalPriceNIO = Math.round(finalPrice * rate * 100) / 100;
    const piece = await tx.jewelryPiece.update({
      where: { id: pieceId },
      data: { status: "SOLD" }
    });
    const invoice = await tx.salesInvoice.create({
      data: {
        id: generateUUID(),
        totalAmount: finalPriceNIO,
        paymentMethod: "Efectivo",
        status: "COMPLETED",
        userId,
        customerId,
        sessionId: "DEFAULT",
        salesInvoiceItem: {
          create: [{
            id: generateUUID(),
            productId: piece.id,
            productName: piece.name,
            quantity: 1,
            unitPrice: finalPriceNIO,
            totalPrice: finalPriceNIO,
            priceLevel: 0
          }]
        }
      }
    });
    await tx.auditLog.create({
      data: {
        id: generateUUID(),
        userId,
        action: "JEWELRY_PIECE_SOLD",
        entity: "JewelryPiece",
        entityId: piece.id
      }
    });
    return invoice;
  });
}
async function revertJewelrySale(pieceId, masterCode, userId) {
  await BusinessGuard.assertMode("JEWELRY");
  try {
    const settings = await db_default.systemSettings.findFirst();
    if (!settings || settings.recoveryKey !== masterCode) {
      return { success: false, error: "C\xF3digo maestro incorrecto." };
    }
    const piece = await db_default.jewelryPiece.findUnique({ where: { id: pieceId } });
    if (!piece) return { success: false, error: "Pieza no encontrada." };
    if (piece.status !== "SOLD") return { success: false, error: "La pieza no est\xE1 marcada como vendida." };
    await db_default.$transaction(async (tx) => {
      await tx.jewelryPiece.update({
        where: { id: pieceId },
        data: { status: "AVAILABLE" }
      });
      await tx.auditLog.create({
        data: {
          id: generateUUID(),
          userId,
          action: "JEWELRY_PIECE_REVERTED",
          entity: "JewelryPiece",
          entityId: pieceId
        }
      });
    });
    return { success: true };
  } catch (error) {
    console.error("Error reverting jewelry sale:", error);
    return { success: false, error: "Error al revertir la venta." };
  }
}

// src/lib/actions/kardex.ts
var kardex_exports = {};
__export(kardex_exports, {
  getInventoryMovements: () => getInventoryMovements2,
  getKardexReport: () => getKardexReport
});
init_db();
async function getInventoryMovements2(limit) {
  try {
    const take = Math.min(limit || 500, 2e3);
    const movements = await db_default.inventoryMovement.findMany({
      orderBy: { timestamp: "desc" },
      include: { user: true },
      take
    });
    const mappedMovements = movements.map((m) => ({
      id: m.id,
      timestamp: m.timestamp,
      productName: m.productName,
      movementType: m.movementType,
      movementId: m.movementId,
      quantityChange: m.quantityChange,
      previousQuantity: m.previousQuantity,
      newQuantity: m.newQuantity,
      user: m.user.name,
      inventoryType: m.inventoryType
    }));
    return { success: true, data: mappedMovements };
  } catch (error) {
    console.error("Error fetching inventory movements:", error);
    return { success: false, error: "Failed to fetch inventory movements" };
  }
}
async function getKardexReport(startIso, endIso, inventoryType) {
  try {
    const movements = await db_default.inventoryMovement.findMany({
      where: {
        timestamp: { gte: startIso, lte: endIso },
        ...inventoryType && inventoryType !== "all" ? { inventoryType } : {}
      },
      orderBy: [{ productName: "asc" }, { timestamp: "asc" }]
    });
    if (!movements.length) return { success: true, data: [] };
    const names = [...new Set(movements.map((m) => m.productName))];
    const products = await db_default.product.findMany({
      where: { name: { in: names } },
      select: { name: true, barcode: true, category: true, costPriceNIO: true, priceNIO: true }
    });
    const productMap = new Map(products.map((p) => [p.name, p]));
    const grouped = /* @__PURE__ */ new Map();
    for (const m of movements) {
      const key = `${m.inventoryType}::${m.productName}`;
      let g = grouped.get(key);
      if (!g) {
        g = {
          productName: m.productName,
          inventoryType: m.inventoryType,
          initialStock: m.previousQuantity,
          finalStock: m.newQuantity,
          entries: 0,
          exits: 0
        };
        grouped.set(key, g);
      }
      g.finalStock = m.newQuantity;
      if (m.quantityChange > 0) g.entries += m.quantityChange;
      else g.exits += Math.abs(m.quantityChange);
    }
    const rows = Array.from(grouped.values()).map((g) => {
      const p = productMap.get(g.productName);
      const cost = p?.costPriceNIO ?? 0;
      return {
        productName: g.productName,
        barcode: p?.barcode ?? null,
        category: p?.category ?? "General",
        inventoryType: g.inventoryType,
        initialStock: g.initialStock,
        entries: g.entries,
        exits: g.exits,
        finalStock: g.finalStock,
        costPriceNIO: cost,
        priceNIO: p?.priceNIO ?? 0,
        inventoryValue: cost * g.finalStock
      };
    });
    return { success: true, data: rows };
  } catch (error) {
    console.error("Error fetching kardex report:", error);
    return { success: false, error: "Failed to fetch kardex report" };
  }
}

// src/lib/actions/license.ts
var license_exports = {};
__export(license_exports, {
  activateInitialLicense: () => activateInitialLicense,
  activateLicenseByKey: () => activateLicenseByKey,
  checkLicenseStatus: () => checkLicenseStatus,
  renewLicense: () => renewLicense
});
init_db();

// src/lib/license-keys.ts
var LICENSE_KEYS = [
  "ABC123DEF",
  "XYZ789GHI",
  "MNO456PQR",
  "STU123VWX",
  "YZA789BCD",
  "EFG456HIJ",
  "KLM123NOP",
  "QRS789TUV",
  "WXY456ZAB",
  "CDE123FGH"
];
var ANNUAL_LICENSE_KEYS = [
  "ANV1-5829-XLZ",
  "ANV1-9472-MPK",
  "ANV1-3105-BWR",
  "ANV1-7684-DQT",
  "ANV1-2291-JSN",
  "ANV1-8530-HVG",
  "ANV1-4967-LFX",
  "ANV1-1742-KYZ",
  "ANV1-6318-PRM",
  "ANV1-5024-TWB"
];
var PREMIUM_LICENSE_KEYS = [
  "PREMIUM-2024-001",
  "PREMIUM-2024-002",
  "PREMIUM-2024-003",
  "PREMIUM-2024-004",
  "PREMIUM-2024-005",
  "PREMIUM-2024-006",
  "PREMIUM-2024-007",
  "PREMIUM-2024-008",
  "PREMIUM-2024-009",
  "PREMIUM-2024-010"
];
var DEMO_LICENSE_KEYS = [
  "DEMO-15D-001",
  "DEMO-15D-002",
  "DEMO-15D-003",
  "DEMO-15D-004",
  "DEMO-15D-005"
];
var DEMO_KEY_PREFIX = "DEMO";
function isDemoKey(key) {
  const upperKey = key.trim().toUpperCase();
  return DEMO_LICENSE_KEYS.includes(upperKey) || upperKey.startsWith(DEMO_KEY_PREFIX);
}
function isValidLicense(key) {
  const upperKey = key.toUpperCase();
  if (LICENSE_KEYS.includes(upperKey)) return true;
  if (PREMIUM_LICENSE_KEYS.includes(upperKey)) return true;
  if (ANNUAL_LICENSE_KEYS.includes(upperKey)) return true;
  return isDemoKey(upperKey);
}
function getLicenseType(key) {
  const upperKey = key.toUpperCase();
  if (PREMIUM_LICENSE_KEYS.includes(upperKey)) return "premium";
  if (ANNUAL_LICENSE_KEYS.includes(upperKey)) return "annual";
  if (isDemoKey(upperKey)) return "demo_15";
  if (LICENSE_KEYS.includes(upperKey)) return "basic";
  return "invalid";
}
function computeExpirationDate(licenseType, from = /* @__PURE__ */ new Date(), demoDays = 15) {
  const expirationDate = new Date(from.getTime());
  if (licenseType === "premium" || licenseType === "basic") {
    expirationDate.setFullYear(from.getFullYear() + 100);
  } else if (licenseType === "annual") {
    expirationDate.setFullYear(from.getFullYear() + 1);
  } else if (licenseType === "demo" || licenseType === "demo_15") {
    expirationDate.setDate(from.getDate() + demoDays);
  }
  return expirationDate;
}

// src/lib/actions/license.ts
async function checkLicenseStatus() {
  const settings = await db_default.systemSettings.findFirst();
  if (!settings) return {
    status: "unregistered",
    isExpired: true,
    isDemo: false,
    daysRemaining: 0,
    startDate: null,
    expirationDate: null
  };
  const now = /* @__PURE__ */ new Date();
  const expirationDate = settings.licenseExpirationDate;
  const startDate = settings.licenseStartDate;
  const isDemo = !!settings.licenseStatus ? settings.licenseStatus.toLowerCase().includes("demo") : false;
  if (!expirationDate) {
    return {
      status: settings.licenseStatus || "unregistered",
      isExpired: true,
      isDemo,
      daysRemaining: 0,
      startDate,
      expirationDate: null
    };
  }
  const isExpired = now > expirationDate;
  let daysRemaining = 0;
  if (!isExpired) {
    const msPerDay = 1e3 * 60 * 60 * 24;
    daysRemaining = Math.max(0, Math.floor((expirationDate.getTime() - now.getTime()) / msPerDay));
  }
  return {
    status: isExpired ? "expired" : settings.licenseStatus || "registered",
    isExpired,
    isDemo,
    daysRemaining,
    startDate,
    expirationDate
  };
}
async function renewLicense(years = 1) {
  const session = await verifySession();
  if (!session || session.role !== "master-admin" && session.role !== "admin") {
    return { success: false, error: "Unauthorized" };
  }
  const settings = await db_default.systemSettings.findFirst();
  if (!settings) return { success: false, error: "System settings not found" };
  const now = /* @__PURE__ */ new Date();
  let newStartDate = settings.licenseStartDate || now;
  let currentExpiration = settings.licenseExpirationDate;
  let newExpirationDate = new Date(currentExpiration && currentExpiration > now ? currentExpiration : now);
  newExpirationDate.setFullYear(newExpirationDate.getFullYear() + years);
  await db_default.systemSettings.update({
    where: { id: settings.id },
    data: {
      licenseStartDate: newStartDate,
      licenseExpirationDate: newExpirationDate,
      licenseStatus: "registered"
    }
  });
  sendActivationNotification("BOT\xD3N RENEVAR", settings.pharmacyName, `RENOVACI\xD3N ANUAL (+${years} a\xF1o/s)`);
  revalidatePath("/");
  return { success: true, newExpirationDate };
}
async function activateInitialLicense() {
  return renewLicense(1);
}
var PERMANENT_KEYS = [
  "ABC123DEF",
  "XYZ789GHI",
  "MNO456PQR",
  "STU123VWX",
  "YZA789BCD",
  "EFG456HIJ",
  "KLM123NOP",
  "QRS789TUV",
  "WXY456ZAB",
  "CDE123FGH"
];
var ANNUAL_KEYS = [
  "ANV1-5829-XLZ",
  "ANV1-9472-MPK",
  "ANV1-3105-BWR",
  "ANV1-7684-DQT",
  "ANV1-2291-JSN",
  "ANV1-8530-HVG",
  "ANV1-4967-LFX",
  "ANV1-1742-KYZ",
  "ANV1-6318-PRM",
  "ANV1-5024-TWB"
];
var PREMIUM_KEYS = [
  "PREMIUM-2024-001",
  "PREMIUM-2024-002",
  "PREMIUM-2024-003",
  "PREMIUM-2024-004",
  "PREMIUM-2024-005",
  "PREMIUM-2024-006",
  "PREMIUM-2024-007",
  "PREMIUM-2024-008",
  "PREMIUM-2024-009",
  "PREMIUM-2024-010"
];
async function activateLicenseByKey(key) {
  const session = await verifySession();
  if (!session || session.role !== "master-admin" && session.role !== "admin") {
    return { success: false, error: "No autorizado" };
  }
  const settings = await db_default.systemSettings.findFirst();
  if (!settings) return { success: false, error: "Configuraci\xF3n no encontrada" };
  const trimmedKey = key.trim().toUpperCase();
  let isPermanent = PERMANENT_KEYS.includes(trimmedKey);
  let isAnnual = ANNUAL_KEYS.includes(trimmedKey);
  let isPremium = PREMIUM_KEYS.includes(trimmedKey);
  let isDemo = isDemoKey(trimmedKey);
  if (!isPermanent && !isAnnual && !isPremium && !isDemo) {
    return { success: false, error: "C\xF3digo de licencia inv\xE1lido" };
  }
  const licenseType = getLicenseType(trimmedKey);
  const now = /* @__PURE__ */ new Date();
  const expirationDate = computeExpirationDate(licenseType, now);
  await db_default.systemSettings.update({
    where: { id: settings.id },
    data: {
      licenseStartDate: now,
      licenseExpirationDate: expirationDate,
      licenseStatus: isDemo ? "demo" : "registered",
      isPremium
      // Activar premium si la llave es de esa lista
    }
  });
  let message = "Licencia ANUAL activada";
  let typeName = "ANUAL CL\xC1SICA";
  if (isPremium) {
    message = "Licencia PREMIUM PERMANENTE activada";
    typeName = "PREMIUM PERMANENTE";
  } else if (isPermanent) {
    message = "Licencia PERMANENTE CL\xC1SICA activada";
    typeName = "PERMANENTE CL\xC1SICA";
  } else if (isDemo) {
    const demoExpiration = expirationDate.toLocaleDateString("es-ES");
    message = `\xA1Licencia Demo activada con \xE9xito! Su periodo de prueba vence el ${demoExpiration}.`;
    typeName = "DEMO (15 D\xEDas)";
  }
  sendActivationNotification(trimmedKey, settings.pharmacyName, typeName);
  revalidatePath("/");
  return {
    success: true,
    message,
    expirationDate,
    isDemo
  };
}

// src/lib/actions/orders.ts
var orders_exports = {};
__export(orders_exports, {
  createOrder: () => createOrder,
  getOrderById: () => getOrderById,
  getOrders: () => getOrders,
  queueOrderForPOS: () => queueOrderForPOS,
  updateOrderStatus: () => updateOrderStatus
});
init_db();

// src/lib/actions/products.ts
var products_exports = {};
__export(products_exports, {
  createProduct: () => createProduct,
  deleteProduct: () => deleteProduct,
  getProductById: () => getProductById,
  getProducts: () => getProducts,
  updateProduct: () => updateProduct
});
init_db();
async function getProducts(inventoryType) {
  try {
    const where = inventoryType ? { inventoryType } : {};
    const products = await db_default.product.findMany({
      where,
      orderBy: { name: "asc" },
      include: {
        categoryRelation: true,
        productVariant: {
          where: { active: true },
          include: { size: true, color: true },
          orderBy: { createdAt: "asc" }
        }
      }
    });
    const expandedProducts = products.flatMap((product) => {
      if (!product.hasVariants) return [product];
      return product.productVariant.map((variant) => ({
        ...product,
        id: variant.id,
        parentProductId: product.id,
        variantId: variant.id,
        parentName: product.name,
        name: `${product.name} - ${variant.size?.name || "N/A"} - ${variant.color?.name || "N/A"}`,
        barcode: variant.barcode || product.barcode,
        priceNIO: variant.price,
        costPriceNIO: variant.cost,
        size: variant.size?.name || "N/A",
        color: variant.color?.name || "N/A",
        stock: variant.stock,
        productVariant: [variant]
      }));
    });
    return { success: true, data: expandedProducts };
  } catch (error) {
    console.error("Error fetching products:", error);
    return { success: false, error: "Failed to fetch products" };
  }
}
async function getProductById(id) {
  try {
    const product = await db_default.product.findUnique({
      where: { id }
    });
    return { success: true, data: product };
  } catch (error) {
    console.error("Error fetching product:", error);
    return { success: false, error: "Failed to fetch product" };
  }
}
async function createProduct(data) {
  try {
    const { categoryId, updatedAt, variantsData, ...cleanData } = data;
    const product = await db_default.$transaction(async (tx) => {
      const createData = {
        ...cleanData,
        id: generateUUID(),
        hasVariants: Boolean(cleanData.hasVariants || variantsData?.length)
      };
      if (categoryId) {
        createData.categoryRelation = { connect: { id: categoryId } };
      }
      const createdProduct = await tx.product.create({ data: createData });
      const validVariants = (variantsData || []).filter((variant) => variant.sizeId && variant.colorId);
      if (createData.hasVariants && validVariants.length) {
        await tx.productVariant.createMany({
          data: validVariants.map((variant) => ({
            id: generateUUID(),
            productId: createdProduct.id,
            sizeId: variant.sizeId,
            colorId: variant.colorId,
            barcode: variant.barcode || null,
            cost: Number(variant.costNIO || 0),
            price: Number(variant.priceNIO || 0),
            stock: Number(variant.stock || 0)
          })),
          skipDuplicates: true
        });
      }
      return createdProduct;
    });
    try {
      await recordAudit({
        userId: "SYSTEM_OR_CURRENT",
        userName: "Administrator",
        action: "CREATE",
        entity: "Product",
        entityId: product.id,
        description: `Cre\xF3 el producto: ${product.name}`,
        metadata: { name: product.name, inventoryType: product.inventoryType, hasVariants: Boolean(product.hasVariants) }
      });
    } catch (auditError) {
      console.error("Error recording product create audit:", auditError);
    }
    revalidatePath("/inventory");
    revalidatePath("/pos");
    return { success: true, data: product };
  } catch (error) {
    console.error("Error creating product:", error);
    return { success: false, error: "Failed to create product" };
  }
}
async function updateProduct(id, data) {
  try {
    const { categoryId, updatedAt, ...cleanData } = data;
    const updateData = { ...cleanData };
    if (categoryId) {
      updateData.categoryRelation = { connect: { id: categoryId } };
    }
    const product = await db_default.$transaction(async (tx) => {
      const updated = await tx.product.update({
        where: { id },
        data: updateData
      });
      return updated;
    });
    try {
      await recordAudit({
        userId: "SYSTEM_OR_CURRENT",
        userName: "Administrator",
        action: "PRICE_CHANGE",
        entity: "Product",
        entityId: product.id,
        description: `Actualiz\xF3 precios/stock del producto: ${product.name}`,
        metadata: { changed: Object.keys(cleanData), new: { priceNIO: product.priceNIO, costPriceNIO: product.costPriceNIO, stock: product.stock } }
      });
    } catch (auditError) {
      console.error("Error recording product update audit:", auditError);
    }
    revalidatePath("/inventory");
    revalidatePath("/pos");
    return { success: true, data: product };
  } catch (error) {
    console.error("Error updating product:", error);
    return { success: false, error: "Failed to update product" };
  }
}
async function deleteProduct(id) {
  try {
    const existing = await db_default.product.findUnique({ where: { id } });
    await db_default.product.delete({
      where: { id }
    });
    try {
      await recordAudit({
        userId: "SYSTEM_OR_CURRENT",
        userName: "Administrator",
        action: "DELETE",
        entity: "Product",
        entityId: id,
        description: `Elimin\xF3 el producto: ${existing?.name || id}`,
        metadata: { deleted: existing }
      });
    } catch (auditError) {
      console.error("Error recording product delete audit:", auditError);
    }
    revalidatePath("/inventory");
    revalidatePath("/pos");
    return { success: true };
  } catch (error) {
    console.error("Error deleting product:", error);
    return { success: false, error: "Failed to delete product" };
  }
}

// src/lib/actions/orders.ts
async function getOrders() {
  const session = await verifySession();
  if (!session) return { success: false, error: "Unauthorized" };
  await BusinessGuard.assertMode("DISTRIBUIDORA");
  try {
    const orders = await db_default.customerOrder.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        customer: { select: { fullName: true } },
        user: { select: { name: true } },
        items: true,
        payments: true
      }
    });
    return { success: true, data: orders };
  } catch (error) {
    console.error("Error fetching orders:", error);
    return { success: false, error: "Failed to fetch orders" };
  }
}
async function getOrderById(id) {
  const session = await verifySession();
  if (!session) return { success: false, error: "Unauthorized" };
  await BusinessGuard.assertMode("DISTRIBUIDORA");
  try {
    const order = await db_default.customerOrder.findUnique({
      where: { id },
      include: {
        customer: { select: { fullName: true, phone: true, address: true } },
        user: { select: { name: true } },
        items: true,
        payments: { include: { user: { select: { name: true } } } },
        routeStops: { include: { route: { select: { name: true } } } }
      }
    });
    return { success: true, data: order };
  } catch (error) {
    console.error("Error fetching order:", error);
    return { success: false, error: "Failed to fetch order" };
  }
}
async function createOrder(data) {
  const session = await verifySession();
  if (!session) return { success: false, error: "Unauthorized" };
  await BusinessGuard.assertMode("DISTRIBUIDORA");
  try {
    const totalAmount = data.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    const order = await db_default.customerOrder.create({
      data: {
        id: generateUUID(),
        customerId: data.customerId,
        userId: session.userId,
        totalAmount,
        notes: data.notes,
        items: {
          create: data.items.map((item) => ({
            id: generateUUID(),
            productName: item.productName,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.quantity * item.unitPrice
          }))
        }
      },
      include: {
        customer: { select: { fullName: true } },
        items: true
      }
    });
    revalidatePath("/orders");
    return { success: true, data: order };
  } catch (error) {
    console.error("Error creating order:", error);
    return { success: false, error: "Failed to create order" };
  }
}
async function updateOrderStatus(id, status) {
  const session = await verifySession();
  if (!session || session.role !== "master-admin" && session.role !== "admin") {
    return { success: false, error: "Unauthorized" };
  }
  await BusinessGuard.assertMode("DISTRIBUIDORA");
  try {
    const order = await db_default.customerOrder.update({
      where: { id },
      data: { status }
    });
    revalidatePath("/orders");
    revalidatePath(`/orders/${id}`);
    return { success: true, data: order };
  } catch (error) {
    console.error("Error updating order status:", error);
    return { success: false, error: "Failed to update order status" };
  }
}
async function queueOrderForPOS(orderId) {
  const session = await verifySession();
  if (!session) return { success: false, error: "Unauthorized" };
  await BusinessGuard.assertMode("DISTRIBUIDORA");
  try {
    const order = await db_default.customerOrder.findUnique({
      where: { id: orderId },
      include: {
        customer: { select: { fullName: true } },
        items: true
      }
    });
    if (!order) return { success: false, error: "Pedido no encontrado" };
    if (order.status === "FACTURADO") return { success: false, error: "Este pedido ya fue facturado" };
    const existing = await db_default.heldSale.findFirst({ where: { orderId, status: "PENDING" } });
    if (existing) {
      revalidatePath("/pos");
      return { success: true, data: existing, cartItems: existing.items || [] };
    }
    const user = await db_default.user.findUnique({ where: { id: session.userId }, select: { name: true } });
    const productsRes = await getProducts();
    const products = productsRes?.success ? productsRes.data ?? [] : [];
    const cartItems = (order.items || []).map((it) => {
      const product = products.find((p) => p.id === it.productId) || products.find((p) => p.name === it.productName);
      if (!product) return null;
      return {
        id: generateUUID(),
        product,
        quantity: Math.max(1, it.quantity || 1),
        unitPrice: Number(it.unitPrice) || 0,
        presentation: "unit",
        isEncargo: false
      };
    }).filter(Boolean);
    const sale = await db_default.heldSale.create({
      data: {
        id: generateUUID(),
        dispatcherId: session.userId,
        dispatcherName: user?.name || session.userId,
        customerName: order.customer?.fullName ?? "Cliente General",
        items: cartItems,
        total: order.totalAmount,
        status: "PENDING",
        orderId
      }
    });
    revalidatePath("/pos");
    return { success: true, data: sale, cartItems };
  } catch (error) {
    console.error("Error queueing order for POS:", error);
    return { success: false, error: "Failed to queue order for POS" };
  }
}

// src/lib/actions/purchase-orders.ts
var purchase_orders_exports = {};
__export(purchase_orders_exports, {
  createPurchaseOrder: () => createPurchaseOrder,
  deletePurchaseOrder: () => deletePurchaseOrder,
  getPurchaseOrderById: () => getPurchaseOrderById,
  getPurchaseOrders: () => getPurchaseOrders,
  receivePurchaseOrder: () => receivePurchaseOrder,
  updatePurchaseOrderStatus: () => updatePurchaseOrderStatus
});
init_db();
async function getPurchaseOrders() {
  const session = await verifySession();
  if (!session) return { success: false, error: "Unauthorized" };
  try {
    const orders = await db_default.purchaseOrder.findMany({
      orderBy: { date: "desc" },
      include: {
        supplier: true,
        purchaseOrderItem: true
      }
    });
    return { success: true, data: orders };
  } catch (error) {
    console.error("Error fetching purchase orders:", error);
    return { success: false, error: "Failed to fetch purchase orders" };
  }
}
async function getPurchaseOrderById(id) {
  const session = await verifySession();
  if (!session) return { success: false, error: "Unauthorized" };
  try {
    const order = await db_default.purchaseOrder.findUnique({
      where: { id },
      include: {
        supplier: true,
        purchaseOrderItem: true
      }
    });
    return { success: true, data: order };
  } catch (error) {
    console.error("Error fetching purchase order:", error);
    return { success: false, error: "Failed to fetch purchase order" };
  }
}
async function createPurchaseOrder(data) {
  const session = await verifySession();
  if (!session) return { success: false, error: "Unauthorized" };
  try {
    const totalAmount = data.items.reduce((sum, item) => sum + item.quantity * item.unitCost, 0);
    const count = await db_default.purchaseOrder.count();
    const orderNumber = `PO-${(/* @__PURE__ */ new Date()).getFullYear()}-${(count + 1).toString().padStart(4, "0")}`;
    const order = await db_default.purchaseOrder.create({
      data: {
        id: generateUUID(),
        orderNumber,
        supplierId: data.supplierId,
        date: data.date,
        expectedDate: data.expectedDate,
        totalAmount,
        notes: data.notes,
        paymentType: data.paymentType || "CASH",
        status: "Pending",
        updatedAt: /* @__PURE__ */ new Date(),
        purchaseOrderItem: {
          create: data.items.map((item) => ({
            id: generateUUID(),
            productId: item.productId,
            productName: item.productName,
            quantity: item.quantity,
            unitCost: item.unitCost,
            totalCost: item.quantity * item.unitCost
          }))
        }
      },
      include: {
        purchaseOrderItem: true
      }
    });
    revalidatePath("/purchases");
    revalidatePath("/purchases/orders");
    return { success: true, data: order };
  } catch (error) {
    console.error("Error creating purchase order:", error);
    return { success: false, error: "Failed to create purchase order" };
  }
}
async function updatePurchaseOrderStatus(id, status) {
  const session = await verifySession();
  if (!session) return { success: false, error: "Unauthorized" };
  try {
    const order = await db_default.purchaseOrder.update({
      where: { id },
      data: { status }
    });
    revalidatePath("/purchases");
    revalidatePath("/purchases/orders");
    return { success: true, data: order };
  } catch (error) {
    console.error("Error updating purchase order status:", error);
    return { success: false, error: "Failed to update purchase order status" };
  }
}
async function receivePurchaseOrder(id, items) {
  const session = await verifySession();
  if (!session) return { success: false, error: "Unauthorized" };
  try {
    return await db_default.$transaction(async (tx) => {
      const order = await tx.purchaseOrder.update({
        where: { id },
        data: { status: "Received" },
        include: { supplier: true }
      });
      for (const item of items) {
        const product = await tx.product.findUnique({ where: { id: item.productId } });
        if (!product) throw new Error(`Product not found: ${item.productId}`);
        await tx.inventoryItem.create({
          data: {
            id: generateUUID(),
            productId: item.productId,
            productName: product.name,
            inventoryType: product.inventoryType,
            batch: item.batch,
            quantity: item.quantity,
            expiryDate: item.expiryDate,
            status: "En Stock"
          }
        });
        const currentStock = await tx.inventoryItem.aggregate({
          _sum: {
            quantity: true
          },
          where: {
            productId: item.productId
          }
        });
        const previousQty = currentStock._sum.quantity || 0;
        await tx.inventoryMovement.create({
          data: {
            id: generateUUID(),
            timestamp: (/* @__PURE__ */ new Date()).toISOString(),
            productName: product.name,
            movementType: "Ingreso",
            movementId: order.orderNumber,
            quantityChange: item.quantity,
            previousQuantity: previousQty,
            newQuantity: previousQty + item.quantity,
            userId: session.userId,
            // Use session user ID
            inventoryType: product.inventoryType
          }
        });
      }
      if (order.paymentType === "CREDIT" && order.totalAmount > 0) {
        const existingInvoice = await tx.purchaseInvoice.findFirst({
          where: { invoiceNumber: order.orderNumber }
        });
        let invoiceId;
        if (existingInvoice) {
          invoiceId = existingInvoice.id;
        } else {
          const newInvoice = await tx.purchaseInvoice.create({
            data: {
              id: generateUUID(),
              invoiceNumber: order.orderNumber,
              supplierId: order.supplierId,
              supplierName: order.supplier?.name || "Proveedor",
              date: (/* @__PURE__ */ new Date()).toISOString().slice(0, 10),
              dueDate: order.expectedDate ? new Date(order.expectedDate).toISOString().slice(0, 10) : (/* @__PURE__ */ new Date()).toISOString().slice(0, 10),
              totalAmount: order.totalAmount,
              paidAmount: 0,
              status: "Pendiente",
              paymentType: "CREDIT",
              details: `Orden de compra ${order.orderNumber}`
            }
          });
          invoiceId = newInvoice.id;
        }
        const existingAp = await tx.accountsPayable.findUnique({ where: { invoiceId } });
        if (!existingAp) {
          await tx.accountsPayable.create({
            data: {
              id: generateUUID(),
              invoiceId,
              supplierId: order.supplierId,
              amount: order.totalAmount,
              paidAmount: 0,
              status: "PENDING",
              dueDate: order.expectedDate ? new Date(order.expectedDate).toISOString() : null
            }
          });
        }
      }
      return { success: true, data: order };
    });
  } catch (error) {
    console.error("Error receiving purchase order:", error);
    return { success: false, error: "Failed to receive purchase order" };
  }
}
async function deletePurchaseOrder(id) {
  const session = await verifySession();
  if (!session) return { success: false, error: "Unauthorized" };
  try {
    await db_default.purchaseOrderItem.deleteMany({
      where: { purchaseOrderId: id }
    });
    await db_default.purchaseOrder.delete({
      where: { id }
    });
    revalidatePath("/purchases");
    revalidatePath("/purchases/orders");
    return { success: true };
  } catch (error) {
    console.error("Error deleting purchase order:", error);
    return { success: false, error: "Failed to delete purchase order" };
  }
}

// src/lib/actions/purchases.ts
var purchases_exports = {};
__export(purchases_exports, {
  createPurchaseInvoice: () => createPurchaseInvoice,
  createPurchaseInvoiceWithItems: () => createPurchaseInvoiceWithItems,
  deletePurchaseInvoice: () => deletePurchaseInvoice,
  getPendingInvoicesAlerts: () => getPendingInvoicesAlerts,
  getPurchaseInvoiceById: () => getPurchaseInvoiceById,
  getPurchaseInvoices: () => getPurchaseInvoices,
  recordSupplierPayment: () => recordSupplierPayment,
  updatePurchaseInvoice: () => updatePurchaseInvoice
});
init_db();
async function getPurchaseInvoices() {
  try {
    const invoices = await db_default.purchaseInvoice.findMany({
      orderBy: { date: "desc" },
      include: { supplier: true, items: true, accountsPayable: true }
    });
    return { success: true, data: invoices };
  } catch (error) {
    console.error("Error fetching purchase invoices:", error);
    return { success: false, error: "Failed to fetch purchase invoices" };
  }
}
async function getPendingInvoicesAlerts(alertDays) {
  try {
    const today = /* @__PURE__ */ new Date();
    const targetDate = /* @__PURE__ */ new Date();
    targetDate.setDate(today.getDate() + alertDays);
    const invoices = await db_default.purchaseInvoice.findMany({
      where: {
        status: "Pendiente"
      },
      include: { supplier: true }
    });
    const alerts = invoices.filter((inv) => {
      if (!inv.dueDate) return false;
      const due = new Date(inv.dueDate);
      return due <= targetDate;
    });
    return { success: true, data: alerts };
  } catch (error) {
    console.error("Error fetching pending invoice alerts:", error);
    return { success: false, error: "Failed to fetch alerts" };
  }
}
async function getPurchaseInvoiceById(id) {
  try {
    const invoice = await db_default.purchaseInvoice.findUnique({
      where: { id },
      include: { supplier: true, items: true, accountsPayable: true }
    });
    return { success: true, data: invoice };
  } catch (error) {
    console.error("Error fetching purchase invoice:", error);
    return { success: false, error: "Failed to fetch purchase invoice" };
  }
}
async function createPurchaseInvoice(data) {
  try {
    const invoice = await db_default.purchaseInvoice.create({
      data: { id: generateUUID(), ...data }
    });
    revalidatePath("/purchases");
    return { success: true, data: invoice };
  } catch (error) {
    console.error("Error creating purchase invoice:", error);
    return { success: false, error: "Failed to create purchase invoice" };
  }
}
async function updatePurchaseInvoice(id, data) {
  try {
    const invoice = await db_default.purchaseInvoice.update({
      where: { id },
      data
    });
    revalidatePath("/purchases");
    return { success: true, data: invoice };
  } catch (error) {
    console.error("Error updating purchase invoice:", error);
    return { success: false, error: "Failed to update purchase invoice" };
  }
}
async function deletePurchaseInvoice(id) {
  try {
    await db_default.purchaseInvoice.delete({
      where: { id }
    });
    revalidatePath("/purchases");
    return { success: true };
  } catch (error) {
    console.error("Error deleting purchase invoice:", error);
    return { success: false, error: "Failed to delete purchase invoice" };
  }
}
async function createPurchaseInvoiceWithItems(invoiceData, items, userId) {
  try {
    return await db_default.$transaction(async (tx) => {
      const paymentType = invoiceData.paymentType || invoiceData.purchaseType === "CREDITO" ? "CREDIT" : "CASH";
      const invoice = await tx.purchaseInvoice.create({
        data: {
          id: generateUUID(),
          supplierId: invoiceData.supplierId,
          supplierName: invoiceData.supplierName,
          invoiceNumber: invoiceData.invoiceNumber,
          date: invoiceData.date,
          issueDate: invoiceData.issueDate || invoiceData.date,
          dueDate: invoiceData.dueDate,
          paymentType,
          subtotal: invoiceData.subtotal ?? void 0,
          tax: invoiceData.tax ?? void 0,
          discount: invoiceData.discount ?? void 0,
          totalAmount: invoiceData.totalAmount,
          paidAmount: invoiceData.paidAmount,
          status: invoiceData.status,
          details: invoiceData.details
        }
      });
      for (const item of items) {
        const bulkPerBase = item.boxUnitsPerBox || 1;
        const isBulk = item.presentation === "box" && bulkPerBase > 1;
        let itemQuantity = item.quantity;
        let itemCostPriceNIO = item.costPriceNIO;
        if (isBulk) {
          itemQuantity = item.quantity * bulkPerBase;
          if (item.quantity > 0) {
            itemCostPriceNIO = item.costPriceNIO / bulkPerBase;
          }
        }
        const normalizedItem = { ...item, quantity: itemQuantity, costPriceNIO: itemCostPriceNIO };
        let productId = normalizedItem.productId;
        let existingProduct = null;
        if (normalizedItem.variantId && productId) {
          const updatedVariant = await tx.productVariant.update({
            where: { id: normalizedItem.variantId },
            data: {
              stock: { increment: normalizedItem.quantity },
              cost: normalizedItem.costPriceNIO,
              price: normalizedItem.priceNIO,
              barcode: normalizedItem.barcode || void 0
            },
            include: { product: true, size: true, color: true }
          });
          await tx.inventoryMovement.create({
            data: {
              id: generateUUID(),
              timestamp: (/* @__PURE__ */ new Date()).toISOString(),
              productName: `${updatedVariant.product.name} - ${updatedVariant.size.name} - ${updatedVariant.color.name}`,
              movementType: "Entrada",
              movementId: `FACTURA-${invoice.invoiceNumber}`,
              quantityChange: normalizedItem.quantity,
              previousQuantity: updatedVariant.stock - normalizedItem.quantity,
              newQuantity: updatedVariant.stock,
              userId,
              inventoryType: normalizedItem.inventoryType
            }
          });
          continue;
        }
        if (productId) {
          existingProduct = await tx.product.findUnique({ where: { id: productId } });
          if (existingProduct && (existingProduct.size !== (normalizedItem.size || null) || existingProduct.color !== (normalizedItem.color || null))) {
            productId = void 0;
          }
        }
        if (!productId) {
          existingProduct = await tx.product.findFirst({
            where: {
              name: normalizedItem.productName.trim(),
              size: normalizedItem.size || null,
              color: normalizedItem.color || null,
              brand: normalizedItem.brand || null,
              inventoryType: normalizedItem.inventoryType
            }
          });
          if (existingProduct) {
            productId = existingProduct.id;
          } else {
            let categoryId = null;
            if (normalizedItem.category) {
              const cat = await tx.category.findFirst({
                where: { name: normalizedItem.category, inventoryType: normalizedItem.inventoryType }
              });
              categoryId = cat?.id || null;
            }
            const newProduct = await tx.product.create({
              data: {
                id: generateUUID(),
                name: normalizedItem.productName.trim(),
                priceNIO: normalizedItem.priceNIO,
                costPriceNIO: normalizedItem.costPriceNIO,
                category: normalizedItem.category,
                categoryRelation: categoryId ? { connect: { id: categoryId } } : void 0,
                inventoryType: normalizedItem.inventoryType,
                unitOfMeasure: "unit",
                minStock: normalizedItem.minStock,
                barcode: normalizedItem.barcode || null,
                brand: normalizedItem.brand || null,
                size: normalizedItem.size || null,
                color: normalizedItem.color || null,
                hasBoxOption: Boolean(normalizedItem.hasBoxOption) || void 0,
                unitsPerBox: normalizedItem.unitsPerBox || void 0,
                boxPrice: normalizedItem.boxPrice || void 0,
                isFractional: Boolean(normalizedItem.isFractional) || void 0,
                bulkUnit: normalizedItem.bulkUnit || void 0,
                baseUnit: normalizedItem.baseUnit || void 0,
                price2: normalizedItem.price2 || null,
                price3: normalizedItem.price3 || null,
                price4: normalizedItem.price4 || null
              }
            });
            productId = newProduct.id;
          }
        }
        if (productId) {
          await tx.product.update({
            where: { id: productId },
            data: {
              costPriceNIO: normalizedItem.costPriceNIO,
              priceNIO: normalizedItem.priceNIO,
              price2: normalizedItem.price2 || null,
              price3: normalizedItem.price3 || null,
              price4: normalizedItem.price4 || null
            }
          });
        }
        const rawBatch = (normalizedItem.batch || "").trim();
        const isGenericBatch = !rawBatch || ["STOCK-INICIAL", "N/A", "NA", "SIN LOTE", "GENERICO", "VARIANTE"].includes(rawBatch.toUpperCase());
        let targetItem = null;
        if (isGenericBatch) {
          targetItem = await tx.inventoryItem.findFirst({
            where: {
              productId,
              inventoryType: normalizedItem.inventoryType,
              batch: { in: ["STOCK-INICIAL", "N/A", "NA", "SIN LOTE", "GENERICO", ""] }
            }
          });
          if (!targetItem) {
            targetItem = await tx.inventoryItem.findFirst({
              where: { productId, inventoryType: normalizedItem.inventoryType }
            });
          }
        } else {
          targetItem = await tx.inventoryItem.findFirst({
            where: {
              productId,
              inventoryType: normalizedItem.inventoryType,
              batch: rawBatch
            }
          });
        }
        if (targetItem) {
          const newQuantity = targetItem.quantity + normalizedItem.quantity;
          const status = newQuantity <= 0 ? "Agotado" : newQuantity < (normalizedItem.minStock || 10) ? "Stock Bajo" : "En Stock";
          await tx.inventoryItem.update({
            where: { id: targetItem.id },
            data: {
              quantity: newQuantity,
              status,
              expiryDate: normalizedItem.expiryDate || targetItem.expiryDate,
              barcode: normalizedItem.barcode || targetItem.barcode || void 0
            }
          });
        } else {
          const status = normalizedItem.quantity <= 0 ? "Agotado" : normalizedItem.quantity < (normalizedItem.minStock || 10) ? "Stock Bajo" : "En Stock";
          await tx.inventoryItem.create({
            data: {
              id: generateUUID(),
              productId,
              productName: normalizedItem.productName,
              barcode: normalizedItem.barcode || null,
              inventoryType: normalizedItem.inventoryType,
              batch: rawBatch || "STOCK-INICIAL",
              quantity: normalizedItem.quantity,
              expiryDate: normalizedItem.expiryDate,
              status
            }
          });
        }
        const currentStockRecords = await tx.inventoryItem.findMany({
          where: { productId, inventoryType: normalizedItem.inventoryType }
        });
        const currentTotal = currentStockRecords.reduce((sum, i) => sum + i.quantity, 0);
        const previousTotal = currentTotal - normalizedItem.quantity;
        await tx.inventoryMovement.create({
          data: {
            id: generateUUID(),
            timestamp: (/* @__PURE__ */ new Date()).toISOString(),
            productName: normalizedItem.productName,
            movementType: "Entrada",
            movementId: `FACTURA-${invoice.invoiceNumber}`,
            quantityChange: normalizedItem.quantity,
            previousQuantity: previousTotal,
            newQuantity: currentTotal,
            userId,
            inventoryType: normalizedItem.inventoryType
          }
        });
        const presentationLabel = normalizedItem.presentation === "box" ? normalizedItem.isFractional ? "QUINTAL" : "BOX" : normalizedItem.isFractional ? "UNIT" : "UNIT";
        await tx.purchaseInvoiceItem.create({
          data: {
            id: generateUUID(),
            purchaseInvoiceId: invoice.id,
            productId: productId || null,
            productName: normalizedItem.productName,
            presentation: presentationLabel,
            quantity: normalizedItem.quantity,
            unitCost: normalizedItem.costPriceNIO,
            subtotal: normalizedItem.quantity * normalizedItem.costPriceNIO,
            unitsConverted: normalizedItem.quantity
          }
        });
      }
      if (paymentType === "CREDIT" && invoice.totalAmount > 0) {
        const existingAp = await tx.accountsPayable.findUnique({
          where: { invoiceId: invoice.id }
        });
        if (!existingAp) {
          await tx.accountsPayable.create({
            data: {
              id: generateUUID(),
              invoiceId: invoice.id,
              supplierId: invoice.supplierId,
              amount: invoice.totalAmount,
              paidAmount: invoice.paidAmount || 0,
              status: (invoice.paidAmount || 0) >= invoice.totalAmount ? "PAID" : "PENDING",
              dueDate: invoice.dueDate || null
            }
          });
        }
      }
      try {
        const actor = await tx.user.findUnique({ where: { id: userId }, select: { name: true } });
        await tx.auditLog.create({
          data: {
            id: generateUUID(),
            userId,
            userName: actor?.name || "Usuario",
            action: "CREATE",
            entity: "Purchase",
            entityId: invoice.id,
            description: `Registr\xF3 factura de proveedor #${invoice.invoiceNumber || invoice.id} por C$${(invoice.totalAmount || 0).toFixed(2)}`,
            metadata: JSON.stringify({ invoiceNumber: invoice.invoiceNumber, totalAmount: invoice.totalAmount, items: items.length })
          }
        });
      } catch (auditError) {
        console.error("Error recording purchase audit:", auditError);
      }
      revalidatePath("/purchases");
      revalidatePath("/inventory");
      revalidatePath("/kardex");
      return { success: true, data: invoice };
    });
  } catch (error) {
    console.error("Error creating purchase invoice with items:", error);
    return { success: false, error: "Failed to create purchase invoice with items" };
  }
}
async function recordSupplierPayment(data) {
  try {
    const amount = Number(data.amount);
    if (!data.invoiceId || !amount || amount <= 0) {
      return { success: false, error: "Monto o factura inv\xE1lidos." };
    }
    const result = await db_default.$transaction(async (tx) => {
      const invoice = await tx.purchaseInvoice.findUnique({ where: { id: data.invoiceId } });
      if (!invoice) throw new Error("Factura de compra no encontrada");
      const newPaid = (invoice.paidAmount || 0) + amount;
      const remaining = invoice.totalAmount - newPaid;
      const status = remaining <= 0 ? "Pagada" : newPaid > 0 ? "Pagada Parcialmente" : "Pendiente";
      await tx.purchaseInvoice.update({
        where: { id: invoice.id },
        data: { paidAmount: newPaid, status }
      });
      const ap = await tx.accountsPayable.findUnique({ where: { invoiceId: invoice.id } });
      if (ap) {
        const apNewPaid = (ap.paidAmount || 0) + amount;
        const apRemaining = ap.amount - apNewPaid;
        await tx.accountsPayable.update({
          where: { id: ap.id },
          data: {
            paidAmount: apNewPaid,
            status: apRemaining <= 0 ? "PAID" : "PENDING"
          }
        });
      }
      if (data.sessionId && /efectivo/i.test(data.paymentMethod)) {
        const session = await tx.cashRegisterSession.findUnique({ where: { id: data.sessionId } });
        if (session && session.status === "open") {
          await tx.cashOutflow.create({
            data: {
              id: generateUUID(),
              sessionId: session.id,
              amount,
              reason: `Pago a proveedor - Factura #${invoice.invoiceNumber}${data.notes ? ` (${data.notes})` : ""}`
            }
          });
        }
      }
      return { ...invoice, paidAmount: newPaid, status };
    });
    revalidatePath("/purchases");
    revalidatePath("/dashboard");
    return { success: true, data: result };
  } catch (error) {
    console.error("Error recording supplier payment:", error);
    return { success: false, error: error?.message || "Failed to record supplier payment" };
  }
}

// src/lib/actions/quotations.ts
var quotations_exports = {};
__export(quotations_exports, {
  cancelQuote: () => cancelQuote,
  convertQuoteToInvoice: () => convertQuoteToInvoice,
  createQuote: () => createQuote,
  getQuoteByNumber: () => getQuoteByNumber,
  getQuotes: () => getQuotes
});
init_db();
async function createQuote(data) {
  const session = await verifySession();
  if (!session) return { success: false, error: "Unauthorized" };
  try {
    const subtotal = data.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
    const quote = await db_default.quote.create({
      data: {
        id: generateUUID(),
        customerName: data.customerName || "Cliente General",
        customerPhone: data.customerPhone || null,
        expirationDays: data.expirationDays || 30,
        subtotal,
        tax: 0,
        total: data.total || subtotal,
        status: "PENDING",
        notes: data.notes || null,
        userId: session.id || session.userId,
        quoteItem: {
          create: data.items.map((item) => ({
            id: generateUUID(),
            productId: item.productId || null,
            productName: item.productName,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.unitPrice * item.quantity,
            variantId: item.variantId || null,
            priceLevel: typeof item.priceLevel === "number" ? item.priceLevel : 1
          }))
        }
      },
      include: { quoteItem: true }
    });
    revalidatePath("/quotations");
    return { success: true, data: quote };
  } catch (error) {
    console.error("Error creating quote:", error);
    return { success: false, error: error instanceof Error ? error.message : "Error al crear cotizaci\xF3n" };
  }
}
async function getQuotes(search) {
  const session = await verifySession();
  if (!session) return { success: false, error: "Unauthorized" };
  try {
    const where = {};
    if (search) {
      const searchNum = parseInt(search.replace(/^COT-/i, "").replace(/^0+/, ""), 10);
      if (Number.isFinite(searchNum) && searchNum > 0) {
        where.OR = [
          { quoteNumber: searchNum },
          { customerName: { contains: search } }
        ];
      } else {
        where.customerName = { contains: search };
      }
    }
    const quotes = await db_default.quote.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { quoteItem: true, user: true }
    });
    return { success: true, data: quotes };
  } catch (error) {
    console.error("Error fetching quotes:", error);
    return { success: false, error: "Error al obtener cotizaciones" };
  }
}
async function getQuoteByNumber(quoteNumber) {
  const session = await verifySession();
  if (!session) return { success: false, error: "Unauthorized" };
  try {
    let parsed;
    if (typeof quoteNumber === "string") {
      const cleaned = quoteNumber.replace(/^COT-/i, "").replace(/^0+/, "");
      parsed = cleaned === "" ? 1 : parseInt(cleaned, 10);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        return { success: false, error: "N\xFAmero de cotizaci\xF3n inv\xE1lido" };
      }
    } else {
      parsed = quoteNumber;
    }
    const quote = await db_default.quote.findUnique({
      where: { quoteNumber: parsed },
      include: { quoteItem: true, user: true }
    });
    if (!quote) {
      return { success: false, error: "Cotizaci\xF3n no encontrada" };
    }
    return { success: true, data: quote };
  } catch (error) {
    console.error("Error fetching quote:", error);
    return { success: false, error: "Error al buscar cotizaci\xF3n" };
  }
}
async function convertQuoteToInvoice(quoteId, sessionId, userId, inventoryType, paymentMethod, customerId) {
  const session = await verifySession();
  if (!session) return { success: false, error: "Unauthorized" };
  try {
    const quote = await db_default.quote.findUnique({
      where: { id: quoteId },
      include: { quoteItem: true }
    });
    if (!quote) {
      return { success: false, error: "Cotizaci\xF3n no encontrada" };
    }
    if (quote.status === "CONVERTED") {
      return { success: false, error: "Esta cotizaci\xF3n ya fue convertida en factura" };
    }
    if (quote.status === "CANCELLED") {
      return { success: false, error: "Esta cotizaci\xF3n fue cancelada" };
    }
    const transactionId = `TX-${Date.now()}-${Math.floor(Math.random() * 1e3)}`;
    let createdInvoiceNumber = 0;
    await db_default.$transaction(async (tx) => {
      const quoteItems = quote.quoteItem || [];
      for (const item of quoteItems) {
        if (!item.productId) continue;
        const inventoryItems = await tx.inventoryItem.findMany({
          where: {
            productId: item.productId,
            inventoryType,
            quantity: { gt: 0 }
          },
          orderBy: { expiryDate: "asc" }
        });
        let remainingToSell = item.quantity;
        for (const invItem of inventoryItems) {
          if (remainingToSell <= 0) break;
          const quantityToTake = Math.min(invItem.quantity, remainingToSell);
          const updatedInvItem = await tx.inventoryItem.update({
            where: { id: invItem.id },
            data: { quantity: { decrement: quantityToTake } }
          });
          if (updatedInvItem.quantity < 0) {
            throw new Error(`Stock insuficiente para: ${item.productName}`);
          }
          const newQuantity = updatedInvItem.quantity;
          const status = newQuantity <= 0 ? "Agotado" : newQuantity < 10 ? "Stock Bajo" : "En Stock";
          if (updatedInvItem.status !== status) {
            await tx.inventoryItem.update({
              where: { id: invItem.id },
              data: { status }
            });
          }
          const currentStockRecords = await tx.inventoryItem.findMany({
            where: { productId: item.productId, inventoryType }
          });
          const currentTotal = currentStockRecords.reduce((sum, i) => sum + i.quantity, 0);
          const previousTotal = currentTotal + quantityToTake;
          await tx.inventoryMovement.create({
            data: {
              id: generateUUID(),
              timestamp: (/* @__PURE__ */ new Date()).toISOString(),
              productName: item.productName,
              movementType: "Salida",
              movementId: transactionId,
              quantityChange: -quantityToTake,
              previousQuantity: previousTotal,
              newQuantity: currentTotal,
              userId,
              inventoryType
            }
          });
          remainingToSell -= quantityToTake;
        }
        if (remainingToSell > 0) {
          throw new Error(`Stock insuficiente para: ${item.productName}`);
        }
      }
      const salesInvoice = await tx.salesInvoice.create({
        data: {
          id: generateUUID(),
          totalAmount: quote.total,
          paymentMethod,
          status: "COMPLETED",
          sessionId,
          userId,
          customerId: customerId || null,
          salesInvoiceItem: {
            create: quoteItems.map((item) => ({
              id: generateUUID(),
              productId: item.productId || item.productName,
              productName: item.productName,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalPrice: item.totalPrice,
              variantId: item.variantId || null,
              priceLevel: typeof item.priceLevel === "number" ? item.priceLevel : 1
            }))
          }
        }
      });
      createdInvoiceNumber = salesInvoice.invoiceNumber;
      if (isCreditPayment(paymentMethod)) {
        if (!customerId) throw new Error("Cliente es requerido para venta al cr\xE9dito");
        const customer = await tx.customer.findUnique({ where: { id: customerId } });
        if (!customer || !customer.hasCredit) throw new Error("El cliente no tiene habilitado el cr\xE9dito");
        const newBalance = customer.currentBalance + quote.total;
        if (customer.creditLimit > 0 && newBalance > customer.creditLimit) {
          throw new Error(`L\xEDmite de cr\xE9dito excedido. Disponible: C$ ${(customer.creditLimit - customer.currentBalance).toFixed(2)}`);
        }
        await tx.customer.update({
          where: { id: customerId },
          data: { currentBalance: { increment: quote.total } }
        });
      }
      const updateData = { totalSales: { increment: quote.total } };
      switch (getPaymentBucket(paymentMethod)) {
        case "cash":
          updateData.salesCash = { increment: quote.total };
          break;
        case "card":
          updateData.salesCard = { increment: quote.total };
          break;
        case "usd":
          updateData.salesUSD = { increment: quote.total };
          break;
        case "credit":
          updateData.salesCredit = { increment: quote.total };
          break;
        case "other":
          break;
      }
      await tx.cashRegisterSession.update({
        where: { id: sessionId },
        data: updateData
      });
      await tx.quote.update({
        where: { id: quoteId },
        data: { status: "CONVERTED", convertedInvoiceId: salesInvoice.id }
      });
    });
    revalidatePath("/pos");
    revalidatePath("/inventory");
    revalidatePath("/quotations");
    return { success: true, invoiceNumber: createdInvoiceNumber };
  } catch (error) {
    console.error("Error converting quote:", error);
    return { success: false, error: error instanceof Error ? error.message : "Error al convertir cotizaci\xF3n" };
  }
}
async function cancelQuote(quoteId) {
  const session = await verifySession();
  if (!session) return { success: false, error: "Unauthorized" };
  try {
    await db_default.quote.update({
      where: { id: quoteId },
      data: { status: "CANCELLED" }
    });
    revalidatePath("/quotations");
    return { success: true };
  } catch (error) {
    console.error("Error cancelling quote:", error);
    return { success: false, error: "Error al cancelar cotizaci\xF3n" };
  }
}

// src/lib/actions/reports.ts
var reports_exports = {};
__export(reports_exports, {
  getCashClosingReport: () => getCashClosingReport,
  getCreditPerformanceData: () => getCreditPerformanceData,
  getExpiringProducts: () => getExpiringProducts,
  getLowStockInventory: () => getLowStockInventory,
  getPriceLevelAnalysis: () => getPriceLevelAnalysis,
  getSalesData: () => getSalesData,
  getTopProducts: () => getTopProducts
});
init_db();
async function getSalesData(startDate, endDate) {
  const currentYear = (/* @__PURE__ */ new Date()).getFullYear();
  const whereClause = {
    movementType: "Venta"
  };
  if (startDate && endDate) {
    whereClause.timestamp = {
      gte: startDate.toISOString(),
      lte: endDate.toISOString()
    };
  } else {
    whereClause.timestamp = {
      startsWith: `${currentYear}`
    };
  }
  const sales = await db_default.inventoryMovement.findMany({
    where: whereClause
  });
  const monthlyData = Array(12).fill(0);
  const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  const products = await db_default.product.findMany();
  const productPriceMap = new Map(products.map((p) => [p.name, p.priceNIO]));
  sales.forEach((sale) => {
    const date = new Date(sale.timestamp);
    const month = date.getMonth();
    const quantity = Math.abs(sale.quantityChange);
    const price = productPriceMap.get(sale.productName) || 0;
    monthlyData[month] += quantity * price;
  });
  return monthNames.map((month, index) => ({
    month,
    sales: monthlyData[index] || 0
  }));
}
async function getTopProducts(startDate, endDate) {
  const whereClause = {
    movementType: "Venta"
  };
  if (startDate && endDate) {
    whereClause.timestamp = {
      gte: startDate.toISOString(),
      lte: endDate.toISOString()
    };
  }
  const sales = await db_default.inventoryMovement.findMany({
    where: whereClause
  });
  const products = await db_default.product.findMany();
  const productPriceMap = new Map(products.map((p) => [p.name, p.priceNIO]));
  const productStats = /* @__PURE__ */ new Map();
  sales.forEach((sale) => {
    const quantity = Math.abs(sale.quantityChange);
    const price = productPriceMap.get(sale.productName) || 0;
    if (!productStats.has(sale.productName)) {
      productStats.set(sale.productName, { unitsSold: 0, revenue: 0 });
    }
    const stats = productStats.get(sale.productName);
    stats.unitsSold += quantity || 0;
    stats.revenue += (quantity || 0) * (price || 0);
  });
  return Array.from(productStats.entries()).map(([name, stats]) => ({
    name,
    unitsSold: stats.unitsSold || 0,
    revenue: stats.revenue || 0
  })).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
}
async function getLowStockInventory() {
  const inventory = await db_default.inventoryItem.findMany({
    include: {
      product: true
    }
  });
  const totals = /* @__PURE__ */ new Map();
  for (const item of inventory) {
    const key = item.productId || `${item.inventoryType}::${item.productName}`;
    const current = totals.get(key) || { total: 0, minStock: item.product.minStock || 10 };
    current.total += item.quantity;
    current.minStock = item.product.minStock || current.minStock || 10;
    totals.set(key, current);
  }
  const lowStockProductIds = /* @__PURE__ */ new Set();
  for (const [key, agg] of totals.entries()) {
    if (agg.total <= 0 || agg.total < agg.minStock) {
      lowStockProductIds.add(key);
    }
  }
  const resultMap = /* @__PURE__ */ new Map();
  for (const item of inventory) {
    const key = item.productId || `${item.inventoryType}::${item.productName}`;
    if (!lowStockProductIds.has(key)) continue;
    if (resultMap.has(key)) continue;
    const agg = totals.get(key);
    resultMap.set(key, {
      id: item.id,
      productName: item.productName,
      quantity: agg.total,
      minStock: agg.minStock,
      status: agg.total <= 0 ? "Agotado" : "Stock Bajo"
    });
  }
  return Array.from(resultMap.values());
}
async function getExpiringProducts(daysThreshold = 30) {
  const today = /* @__PURE__ */ new Date();
  const futureDate = /* @__PURE__ */ new Date();
  futureDate.setDate(today.getDate() + daysThreshold);
  const inventory = await db_default.inventoryItem.findMany({
    where: {
      expiryDate: {
        lte: futureDate.toISOString(),
        gte: today.toISOString()
      },
      quantity: {
        gt: 0
        // Only show items we actually have
      }
    }
  });
  return inventory.map((item) => ({
    id: item.id,
    productName: item.productName,
    batch: item.batch,
    expiryDate: item.expiryDate,
    quantity: item.quantity
  }));
}
async function getCashClosingReport(startDate, endDate, cashierId) {
  const whereClause = {
    status: "closed"
    // Only interested in closed sessions for the report
  };
  if (startDate && endDate) {
    whereClause.openingTime = {
      gte: startDate.toISOString()
    };
    whereClause.openingTime = {
      gte: startDate.toISOString(),
      lte: endDate.toISOString()
    };
  }
  if (cashierId && cashierId !== "all") {
    whereClause.cashierId = cashierId;
  }
  const sessions = await db_default.cashRegisterSession.findMany({
    where: whereClause,
    include: {
      user: true
    },
    orderBy: {
      openingTime: "desc"
    }
  });
  return sessions.map((session) => ({
    id: session.id,
    cashierName: session.cashierName,
    openingTime: session.openingTime,
    closingTime: session.closingTime,
    initialAmount: session.initialAmount || 0,
    finalAmount: session.finalAmount || 0,
    // This is expected cash
    actualCash: session.actualCash || 0,
    // This is reported cash
    salesTotal: session.totalSales || 0,
    difference: session.difference || 0,
    // discrepancy
    // Aliases para reportes/informes: Monto de Apertura y Total Esperado.
    openingBalance: session.initialAmount || 0,
    expectedCash: session.finalAmount || 0,
    status: session.status
  }));
}
async function getCreditPerformanceData(startDate, endDate) {
  const whereClause = { paymentMethod: "Credito" };
  if (startDate && endDate) {
    whereClause.date = { gte: startDate.toISOString(), lte: endDate.toISOString() };
  }
  const creditSales = await db_default.salesInvoice.findMany({
    where: whereClause,
    include: { salesInvoiceItem: true }
  });
  const productStats = /* @__PURE__ */ new Map();
  creditSales.forEach((sale) => {
    sale.salesInvoiceItem.forEach((item) => {
      const stats = productStats.get(item.productName) || { units: 0, revenue: 0 };
      stats.units += item.quantity;
      stats.revenue += item.totalPrice;
      productStats.set(item.productName, stats);
    });
  });
  const topCreditProducts = Array.from(productStats.entries()).map(([name, stats]) => ({ name, units: stats.units, revenue: stats.revenue })).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
  const customers = await db_default.customer.findMany({
    where: { hasCredit: true },
    include: {
      salesInvoice: { where: { paymentMethod: "Credito" } },
      creditPayment: true
    }
  });
  const customerRanking = customers.map((c) => {
    const totalBorrowed2 = c.salesInvoice.reduce((sum, s) => sum + s.totalAmount, 0);
    const totalPaid = c.creditPayment.reduce((sum, p) => sum + p.amount, 0);
    const complianceRate = totalBorrowed2 > 0 ? totalPaid / totalBorrowed2 * 100 : 100;
    const score = c.salesInvoice.length * (complianceRate / 100);
    return {
      id: c.id,
      name: c.fullName,
      score: score || 0,
      totalBorrowed: totalBorrowed2 || 0,
      totalPaid: totalPaid || 0,
      complianceRate: complianceRate || 0,
      lastPayment: c.creditPayment[0]?.timestamp || null
    };
  }).sort((a, b) => b.score - a.score).slice(0, 5);
  const totalBorrowed = customers.reduce((sum, c) => sum + c.salesInvoice.reduce((s, sl) => s + sl.totalAmount, 0), 0);
  const totalRecovered = customers.reduce((sum, c) => sum + c.creditPayment.reduce((p, py) => p + py.amount, 0), 0);
  const recoveryRate = totalBorrowed > 0 ? totalRecovered / totalBorrowed * 100 : 0;
  return {
    topCreditProducts: topCreditProducts.map((p) => ({
      name: p.name,
      units: p.units || 0,
      revenue: p.revenue || 0
    })),
    customerRanking,
    summary: {
      totalBorrowed: totalBorrowed || 0,
      totalRecovered: totalRecovered || 0,
      recoveryRate: recoveryRate || 0,
      activeDebtors: customers.filter((c) => c.currentBalance > 0).length || 0
    }
  };
}
async function getPriceLevelAnalysis(startDate, endDate) {
  const whereClause = { status: "COMPLETED" };
  if (startDate && endDate) {
    whereClause.date = { gte: startDate.toISOString(), lte: endDate.toISOString() };
  }
  const invoices = await db_default.salesInvoice.findMany({
    where: whereClause,
    include: { salesInvoiceItem: true, user: true }
  });
  const summary = /* @__PURE__ */ new Map();
  const byUser = /* @__PURE__ */ new Map();
  invoices.forEach((inv) => {
    const userId = inv.userId;
    const userName = inv.user?.name || inv.user?.username || inv.user?.email || "Cajero";
    if (!byUser.has(userId)) {
      byUser.set(userId, {
        id: userId,
        name: userName,
        total: 0,
        manualCount: 0,
        levels: {}
      });
    }
    const user = byUser.get(userId);
    inv.salesInvoiceItem.forEach((item) => {
      const level = typeof item.priceLevel === "number" ? item.priceLevel : 1;
      const revenue = item.totalPrice || 0;
      const units = item.quantity || 0;
      const sum = summary.get(level) || { units: 0, revenue: 0 };
      sum.units += units;
      sum.revenue += revenue;
      summary.set(level, sum);
      if (!user.levels[level]) user.levels[level] = { units: 0, revenue: 0 };
      user.levels[level].units += units;
      user.levels[level].revenue += revenue;
      user.total += revenue;
      if (level === 0) user.manualCount += 1;
    });
  });
  const levelLabels = {
    0: "Manual / Personalizado",
    1: "Precio 1 (Detalle)",
    2: "Precio 2",
    3: "Precio 3",
    4: "Precio 4"
  };
  const levels = Array.from(summary.entries()).map(([level, data]) => ({
    level,
    label: levelLabels[level] || `Nivel ${level}`,
    units: data.units,
    revenue: data.revenue
  })).sort((a, b) => a.level - b.level);
  const users = Array.from(byUser.values()).map((u) => ({
    id: u.id,
    name: u.name,
    total: u.total,
    manualCount: u.manualCount,
    levels: Object.entries(u.levels).map(([level, data]) => ({
      level: parseInt(level, 10),
      label: levelLabels[parseInt(level, 10)] || `Nivel ${level}`,
      units: data.units,
      revenue: data.revenue
    })).sort((a, b) => a.level - b.level)
  })).sort((a, b) => b.total - a.total);
  const overallTotal = invoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
  return {
    levels,
    users,
    summary: {
      totalRevenue: overallTotal || 0,
      manualLevelCount: summary.get(0)?.units || 0
    }
  };
}

// src/lib/actions/sales.ts
var sales_exports = {};
__export(sales_exports, {
  createSale: () => createSale,
  getInventoryMovements: () => getInventoryMovements3,
  getInvoiceByNumber: () => getInvoiceByNumber2,
  getLastSale: () => getLastSale
});
init_db();

// src/lib/presentations.ts
var getBulkPresentationOptions = (product) => {
  if (!product) return [];
  const options = [];
  const push = (key, name, factor) => {
    if (typeof name === "string" && name.trim().length > 0 && Number(factor) > 0) {
      options.push({ key, name: name.trim(), factor: Number(factor) });
    }
  };
  push("bulk", product.bulkUnit, product.unitsPerBulk);
  if (product.hasBoxOption && Number(product.unitsPerBox) > 1 && !options.some((o) => o.key === "bulk")) {
    options.push({ key: "box", name: product.bulkUnit || "Caja", factor: Number(product.unitsPerBox) });
  }
  push("bulk2", product.bulkUnit2, product.unitsPerBulk2);
  push("bulk3", product.bulkUnit3, product.unitsPerBulk3);
  return options;
};
var resolvePresentationFactor = (product, presentation, presentationName, presentationFactor) => {
  if (typeof presentationFactor === "number" && presentationFactor > 0) return presentationFactor;
  const opts = getBulkPresentationOptions(product);
  const name = presentationName?.trim().toLowerCase();
  const match = opts.find(
    (o) => o.key === presentation || name && o.name.toLowerCase() === name
  );
  if (match) return match.factor;
  if (presentation === "box") return Number(product.unitsPerBox || 1);
  return 1;
};

// src/lib/actions/sales.ts
async function createSale(items, sessionId, userId, inventoryType, totalAmount, paymentMethod, customerId) {
  console.log("--- DEBUG createSale ---");
  console.log("paymentMethod:", paymentMethod);
  console.log("customerId:", customerId);
  const session = await verifySession();
  if (!session) return { success: false, error: "Unauthorized" };
  try {
    const isJewelry = await BusinessGuard.isJewelryMode();
    if (isJewelry && !customerId) {
      return { success: false, error: "El cliente es obligatorio para realizar ventas en modo Joyer\xEDa." };
    }
    const transactionId = `TX-${Date.now()}-${Math.floor(Math.random() * 1e3)}`;
    const roundedTotalAmount = Math.round(totalAmount * 100) / 100;
    const lineTotals = items.reduce((sum, item) => {
      const unitPrice = typeof item.unitPrice === "number" && item.unitPrice > 0 ? item.unitPrice : item.product.priceNIO;
      return sum + unitPrice * item.quantity;
    }, 0);
    const roundedSubtotal = Math.round(lineTotals * 100) / 100;
    const roundedTax = Math.round((roundedTotalAmount - roundedSubtotal) * 100) / 100;
    let createdInvoiceNumber = 0;
    await db_default.$transaction(async (tx) => {
      for (const item of items) {
        const variantId = item.product.variantId;
        const parentProductId = item.product.parentProductId || item.product.id;
        const factor = resolvePresentationFactor(item.product, item.presentation, item.presentationName, item.presentationFactor);
        const physicalUnits = item.quantity * factor;
        const unitPrice = typeof item.unitPrice === "number" && item.unitPrice > 0 ? item.unitPrice : item.product.priceNIO;
        if (variantId) {
          const updatedVariant = await tx.productVariant.update({
            where: { id: variantId },
            data: { stock: { decrement: physicalUnits } },
            include: { size: true, color: true, product: true }
          });
          await tx.inventoryMovement.create({
            data: {
              id: generateUUID(),
              timestamp: (/* @__PURE__ */ new Date()).toISOString(),
              productName: `${updatedVariant.product.name} - ${updatedVariant.size.name} - ${updatedVariant.color.name}`,
              movementType: "Salida",
              movementId: transactionId,
              quantityChange: -physicalUnits,
              previousQuantity: updatedVariant.stock + physicalUnits,
              newQuantity: updatedVariant.stock,
              userId,
              inventoryType
            }
          });
          continue;
        }
        const inventoryItems = await tx.inventoryItem.findMany({
          where: {
            productId: parentProductId,
            inventoryType
          },
          orderBy: { expiryDate: "asc" }
        });
        let remainingToSell = physicalUnits;
        for (const invItem of inventoryItems) {
          if (remainingToSell <= 0) break;
          const quantityToTake = Math.min(invItem.quantity, remainingToSell);
          const invQtyToTake = item.product.isFractional ? Math.ceil(quantityToTake) : quantityToTake;
          const updatedInvItem = await tx.inventoryItem.update({
            where: { id: invItem.id },
            data: {
              quantity: { decrement: invQtyToTake }
            }
          });
          if (updatedInvItem.quantity < 0) {
            throw new Error(`Stock insuficiente para el producto: ${item.product.name} (Race condition detected)`);
          }
          const newQuantity = updatedInvItem.quantity;
          const status = newQuantity <= 0 ? "Agotado" : newQuantity < 10 ? "Stock Bajo" : "En Stock";
          if (updatedInvItem.status !== status) {
            await tx.inventoryItem.update({
              where: { id: invItem.id },
              data: { status }
            });
          }
          const currentStockRecords = await tx.inventoryItem.findMany({
            where: { productId: item.product.id, inventoryType }
          });
          const currentTotal = currentStockRecords.reduce((sum, i) => sum + i.quantity, 0);
          const previousTotal = currentTotal + invQtyToTake;
          await tx.inventoryMovement.create({
            data: {
              id: generateUUID(),
              timestamp: (/* @__PURE__ */ new Date()).toISOString(),
              productName: item.product.name,
              movementType: "Salida",
              movementId: transactionId,
              quantityChange: -(item.product.isFractional ? quantityToTake : invQtyToTake),
              previousQuantity: previousTotal,
              newQuantity: currentTotal,
              userId,
              inventoryType
            }
          });
          remainingToSell -= quantityToTake;
        }
        if (remainingToSell > 0) {
          const encQty = item.product.isFractional ? Math.ceil(remainingToSell) : remainingToSell;
          const currentRecords = await tx.inventoryItem.findMany({
            where: { productId: parentProductId, inventoryType }
          });
          const totalBefore = currentRecords.reduce((sum, i) => sum + i.quantity, 0);
          let target = inventoryItems[inventoryItems.length - 1];
          if (!target) {
            target = await tx.inventoryItem.create({
              data: {
                id: generateUUID(),
                productId: parentProductId,
                productName: item.product.name,
                inventoryType,
                batch: "ENCARGO",
                quantity: 0,
                expiryDate: "2099-12-31",
                status: "Agotado"
              }
            });
          }
          await tx.inventoryItem.update({
            where: { id: target.id },
            data: { quantity: { decrement: encQty } }
          });
          await tx.inventoryMovement.create({
            data: {
              id: generateUUID(),
              timestamp: (/* @__PURE__ */ new Date()).toISOString(),
              productName: item.product.name,
              movementType: "Salida",
              movementId: transactionId,
              quantityChange: -remainingToSell,
              previousQuantity: totalBefore,
              newQuantity: totalBefore - remainingToSell,
              userId,
              inventoryType
            }
          });
        }
      }
      const salesInvoice = await tx.salesInvoice.create({
        data: {
          id: generateUUID(),
          totalAmount: roundedTotalAmount,
          subtotal: roundedSubtotal,
          tax: roundedTax,
          paymentMethod,
          status: "COMPLETED",
          sessionId,
          userId,
          customerId,
          salesInvoiceItem: {
            create: items.map((item) => {
              const invUnitPrice = typeof item.unitPrice === "number" && item.unitPrice > 0 ? item.unitPrice : item.product.priceNIO;
              const isBox = item.presentation === "box" && item.product.hasBoxOption;
              const baseUnit = item.product.baseUnit || null;
              const bulkUnit = item.product.bulkUnit || null;
              return {
                id: generateUUID(),
                productId: item.product.parentProductId || item.product.id,
                productName: item.product.name,
                quantity: item.quantity,
                unitPrice: invUnitPrice,
                totalPrice: invUnitPrice * item.quantity,
                variantId: item.product.variantId || null,
                priceLevel: typeof item.priceLevel === "number" ? item.priceLevel : 1,
                presentationName: item.presentationName ?? (isBox ? bulkUnit : null),
                presentationFactor: resolvePresentationFactor(item.product, item.presentation, item.presentationName, item.presentationFactor),
                baseUnit,
                bulkUnit,
                isEncargo: !!item.isEncargo
              };
            })
          }
        }
      });
      createdInvoiceNumber = salesInvoice.invoiceNumber;
      if (isCreditPayment(paymentMethod)) {
        if (!customerId) throw new Error("Cliente es requerido para venta al cr\xE9dito");
        const customer = await tx.customer.findUnique({ where: { id: customerId } });
        if (!customer || !customer.hasCredit) throw new Error("El cliente no tiene habilitado el cr\xE9dito");
        const newBalance = customer.currentBalance + roundedTotalAmount;
        if (customer.creditLimit > 0 && newBalance > customer.creditLimit) {
          throw new Error(`L\xEDmite de cr\xE9dito excedido. Disponible: C$ ${(customer.creditLimit - customer.currentBalance).toFixed(2)}`);
        }
        await tx.customer.update({
          where: { id: customerId },
          data: { currentBalance: { increment: roundedTotalAmount } }
        });
      }
      const updateData = {
        totalSales: { increment: roundedTotalAmount }
      };
      switch (getPaymentBucket(paymentMethod)) {
        case "cash":
          updateData.salesCash = { increment: roundedTotalAmount };
          break;
        case "card":
          updateData.salesCard = { increment: roundedTotalAmount };
          break;
        case "usd":
          updateData.salesUSD = { increment: roundedTotalAmount };
          break;
        case "credit":
          updateData.salesCredit = { increment: roundedTotalAmount };
          break;
        case "other":
          break;
      }
      await tx.cashRegisterSession.update({
        where: { id: sessionId },
        data: updateData
      });
    });
    revalidatePath("/pos");
    revalidatePath("/inventory");
    revalidatePath("/dashboard");
    try {
      const actor = await db_default.user.findUnique({ where: { id: session.userId }, select: { name: true } });
      await recordAudit({
        userId: session.userId,
        userName: actor?.name || "Usuario",
        action: "CREATE",
        entity: "Sale",
        entityId: `FACTURA-${createdInvoiceNumber}`,
        description: `Registr\xF3 una venta por C$${roundedTotalAmount.toFixed(2)} (factura #${createdInvoiceNumber})`,
        metadata: { invoiceNumber: createdInvoiceNumber, totalAmount: roundedTotalAmount, paymentMethod, items: items.length }
      });
    } catch (auditError) {
      console.error("Error recording sale audit:", auditError);
    }
    return { success: true, invoiceNumber: createdInvoiceNumber };
  } catch (error) {
    console.error("Error creating sale:", error);
    return { success: false, error: error instanceof Error ? error.message : "Error al procesar la venta" };
  }
}
async function getInventoryMovements3() {
  const session = await verifySession();
  if (!session) return [];
  const movements = await db_default.inventoryMovement.findMany({
    orderBy: {
      timestamp: "desc"
    },
    include: {
      user: true
    }
  });
  return movements.map((m) => ({
    id: m.id,
    timestamp: m.timestamp,
    productName: m.productName,
    movementType: m.movementType,
    movementId: m.movementId,
    quantityChange: m.quantityChange,
    previousQuantity: m.previousQuantity,
    newQuantity: m.newQuantity,
    user: m.user.name,
    // The type expects the name string
    inventoryType: m.inventoryType
  }));
}
async function getInvoiceByNumber2(invoiceNumber) {
  const session = await verifySession();
  if (!session) return { success: false, error: "Unauthorized" };
  try {
    let parsed;
    if (typeof invoiceNumber === "string") {
      const cleaned = invoiceNumber.replace(/^0+/, "");
      parsed = cleaned === "" ? 1 : parseInt(cleaned, 10);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        return { success: false, error: "N\xFAmero de factura inv\xE1lido" };
      }
    } else {
      parsed = invoiceNumber;
    }
    const invoice = await db_default.salesInvoice.findUnique({
      where: { invoiceNumber: parsed },
      include: {
        salesInvoiceItem: true,
        customer: true,
        user: true
      }
    });
    if (!invoice) {
      return { success: false, error: "Factura no encontrada" };
    }
    return { success: true, data: invoice };
  } catch (error) {
    console.error("Error fetching invoice:", error);
    return { success: false, error: "Error al buscar la factura" };
  }
}
async function getLastSale(sessionId) {
  const session = await verifySession();
  if (!session) return { success: false, error: "Unauthorized" };
  try {
    const where = { status: "COMPLETED" };
    if (sessionId) where.sessionId = sessionId;
    const invoice = await db_default.salesInvoice.findFirst({
      where,
      orderBy: { date: "desc" },
      include: {
        salesInvoiceItem: true,
        customer: true,
        user: true
      }
    });
    if (!invoice) {
      return { success: false, error: "No hay ventas registradas" };
    }
    return { success: true, data: invoice };
  } catch (error) {
    console.error("Error fetching last sale:", error);
    return { success: false, error: "Error al obtener la \xFAltima venta" };
  }
}

// src/lib/actions/settings.ts
var settings_exports = {};
__export(settings_exports, {
  getSettings: () => getSettings,
  updateSettings: () => updateSettings
});
init_db();
async function getSettings() {
  const session = await verifySession();
  const settings = await db_default.systemSettings.findFirst();
  if (!settings) {
    return {
      pharmacyName: "Omni Inventario +",
      currency: "NIO",
      taxRate: 0.15,
      applyTax: true,
      address: "",
      phone: "",
      rfc: "",
      footerMessage: "",
      website: "",
      includeUnitPrice: false,
      printFullDescription: false,
      recoveryKey: "",
      workflow: "dispatcher-cashier",
      quickSwitchEnabled: false,
      exchangeRate: "36.5",
      allowCash: true,
      blockInsufficientCash: true,
      allowDollars: false,
      allowCard: true,
      troyOunceGrams: 31.1,
      isPremium: false,
      logoSvg: null,
      adminEmail: "",
      smtpEmail: "",
      smtpPassword: "",
      emailNotificationsEnabled: false,
      invoiceAlertDays: 5,
      importProductsInDollars: false
    };
  }
  return {
    id: settings.id,
    businessMode: settings.businessMode,
    pharmacyName: settings.pharmacyName,
    address: settings.address,
    phone: settings.phone,
    rfc: settings.rfc,
    footerMessage: settings.footerMessage,
    website: settings.website,
    includeUnitPrice: settings.includeUnitPrice,
    printFullDescription: settings.printFullDescription,
    currency: settings.currency,
    taxRate: settings.taxRate,
    applyTax: settings.applyTax,
    recoveryKey: settings.recoveryKey,
    workflow: settings.workflow,
    quickSwitchEnabled: settings.quickSwitchEnabled,
    exchangeRate: settings.exchangeRate,
    allowCash: settings.allowCash,
    blockInsufficientCash: settings.blockInsufficientCash,
    allowDollars: settings.allowDollars,
    allowCard: settings.allowCard,
    troyOunceGrams: settings.troyOunceGrams,
    isPremium: settings.isPremium,
    logoSvg: settings.logoSvg,
    jewelryLocationMode: settings.jewelryLocationMode,
    adminEmail: settings.adminEmail,
    smtpEmail: settings.smtpEmail,
    smtpPassword: settings.smtpPassword,
    emailNotificationsEnabled: settings.emailNotificationsEnabled,
    licenseStartDate: settings.licenseStartDate,
    licenseExpirationDate: settings.licenseExpirationDate,
    licenseStatus: settings.licenseStatus,
    invoiceAlertDays: settings.invoiceAlertDays,
    importProductsInDollars: settings.importProductsInDollars
  };
}
async function updateSettings(data) {
  const session = await verifySession();
  if (!session || session.role !== "master-admin" && session.role !== "admin") {
    return { success: false, error: "Unauthorized" };
  }
  const existing = await db_default.systemSettings.findFirst();
  if (existing) {
    await db_default.systemSettings.update({
      where: { id: existing.id },
      data: {
        workflow: data.workflow,
        pharmacyName: data.pharmacyName,
        address: data.address,
        phone: data.phone,
        rfc: data.rfc,
        footerMessage: data.footerMessage,
        website: data.website,
        includeUnitPrice: data.includeUnitPrice,
        printFullDescription: data.printFullDescription,
        currency: data.currency,
        taxRate: data.taxRate,
        applyTax: data.applyTax,
        recoveryKey: data.recoveryKey,
        quickSwitchEnabled: data.quickSwitchEnabled,
        exchangeRate: data.exchangeRate,
        allowCash: data.allowCash,
        blockInsufficientCash: data.blockInsufficientCash,
        allowDollars: data.allowDollars,
        allowCard: data.allowCard,
        troyOunceGrams: data.troyOunceGrams,
        jewelryLocationMode: data.jewelryLocationMode,
        adminEmail: data.adminEmail,
        smtpEmail: data.smtpEmail,
        smtpPassword: data.smtpPassword,
        emailNotificationsEnabled: data.emailNotificationsEnabled,
        licenseStartDate: data.licenseStartDate,
        licenseExpirationDate: data.licenseExpirationDate,
        licenseStatus: data.licenseStatus,
        invoiceAlertDays: data.invoiceAlertDays,
        importProductsInDollars: data.importProductsInDollars
      }
    });
  } else {
    await db_default.systemSettings.create({
      data: {
        id: generateUUID(),
        updatedAt: /* @__PURE__ */ new Date(),
        workflow: data.workflow,
        pharmacyName: data.pharmacyName,
        address: data.address,
        phone: data.phone,
        rfc: data.rfc,
        footerMessage: data.footerMessage,
        website: data.website,
        includeUnitPrice: data.includeUnitPrice,
        printFullDescription: data.printFullDescription,
        currency: data.currency,
        taxRate: data.taxRate,
        applyTax: data.applyTax,
        recoveryKey: data.recoveryKey,
        quickSwitchEnabled: data.quickSwitchEnabled,
        exchangeRate: data.exchangeRate,
        allowCash: data.allowCash,
        blockInsufficientCash: data.blockInsufficientCash,
        allowDollars: data.allowDollars,
        allowCard: data.allowCard,
        troyOunceGrams: data.troyOunceGrams,
        jewelryLocationMode: data.jewelryLocationMode,
        adminEmail: data.adminEmail,
        smtpEmail: data.smtpEmail,
        smtpPassword: data.smtpPassword,
        emailNotificationsEnabled: data.emailNotificationsEnabled,
        licenseStartDate: data.licenseStartDate,
        licenseExpirationDate: data.licenseExpirationDate,
        licenseStatus: data.licenseStatus || "unregistered",
        invoiceAlertDays: data.invoiceAlertDays || 5,
        importProductsInDollars: data.importProductsInDollars || false
      }
    });
  }
  revalidatePath("/");
  return { success: true };
}

// src/lib/actions/suppliers.ts
var suppliers_exports = {};
__export(suppliers_exports, {
  createSupplier: () => createSupplier,
  deleteSupplier: () => deleteSupplier,
  getSupplierById: () => getSupplierById,
  getSuppliers: () => getSuppliers,
  updateSupplier: () => updateSupplier
});
init_db();
async function getSuppliers() {
  const session = await verifySession();
  if (!session) return { success: false, error: "Unauthorized" };
  try {
    const suppliers = await db_default.supplier.findMany({
      orderBy: { name: "asc" }
    });
    return { success: true, data: suppliers };
  } catch (error) {
    console.error("Error fetching suppliers:", error);
    return { success: false, error: "Failed to fetch suppliers" };
  }
}
async function getSupplierById(id) {
  const session = await verifySession();
  if (!session) return { success: false, error: "Unauthorized" };
  try {
    const supplier = await db_default.supplier.findUnique({
      where: { id }
    });
    return { success: true, data: supplier };
  } catch (error) {
    console.error("Error fetching supplier:", error);
    return { success: false, error: "Failed to fetch supplier" };
  }
}
async function createSupplier(data) {
  const session = await verifySession();
  if (!session) return { success: false, error: "Unauthorized" };
  try {
    const supplier = await db_default.supplier.create({
      data: {
        ...data,
        id: generateUUID()
      }
    });
    revalidatePath("/suppliers");
    revalidatePath("/purchases");
    return { success: true, data: supplier };
  } catch (error) {
    console.error("Error creating supplier:", error);
    return { success: false, error: "Failed to create supplier" };
  }
}
async function updateSupplier(id, data) {
  const session = await verifySession();
  if (!session) return { success: false, error: "Unauthorized" };
  try {
    const supplier = await db_default.supplier.update({
      where: { id },
      data
    });
    revalidatePath("/suppliers");
    revalidatePath("/purchases");
    return { success: true, data: supplier };
  } catch (error) {
    console.error("Error updating supplier:", error);
    return { success: false, error: "Failed to update supplier" };
  }
}
async function deleteSupplier(id) {
  const session = await verifySession();
  if (!session) return { success: false, error: "Unauthorized" };
  try {
    await db_default.supplier.delete({
      where: { id }
    });
    revalidatePath("/suppliers");
    revalidatePath("/purchases");
    return { success: true };
  } catch (error) {
    console.error("Error deleting supplier:", error);
    return { success: false, error: "Failed to delete supplier" };
  }
}

// src/lib/actions/upload-image.ts
var upload_image_exports = {};
__export(upload_image_exports, {
  uploadProductImage: () => uploadProductImage
});
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
async function uploadProductImage(formData) {
  const session = await verifySession();
  if (!session) {
    return { success: false, error: "No autorizado" };
  }
  const file = formData.get("image");
  if (!file) {
    return { success: false, error: "No se proporcion\xF3 ninguna imagen" };
  }
  if (!file.type.startsWith("image/")) {
    return { success: false, error: "El archivo debe ser una imagen" };
  }
  if (file.size > 5 * 1024 * 1024) {
    return { success: false, error: "La imagen es demasiado grande (m\xE1ximo 5MB)" };
  }
  try {
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const uploadDir = join(process.cwd(), "public", "uploads", "products");
    try {
      await mkdir(uploadDir, { recursive: true });
    } catch (e) {
    }
    const filename = `${generateUUID()}-${file.name.replace(/\s+/g, "-")}`;
    const path = join(uploadDir, filename);
    await writeFile(path, buffer);
    const imageUrl = `/uploads/products/${filename}`;
    return { success: true, data: imageUrl };
  } catch (error) {
    console.error("Error uploading product image:", error);
    return { success: false, error: "Error interno al subir la imagen" };
  }
}

// src/lib/actions/upload-logo.ts
var upload_logo_exports = {};
__export(upload_logo_exports, {
  removeLogo: () => removeLogo,
  uploadLogo: () => uploadLogo
});
init_db();
async function uploadLogo(svgContent) {
  const session = await verifySession();
  if (!session || session.role !== "master-admin" && session.role !== "admin") {
    return { success: false, error: "No autorizado" };
  }
  const trimmedContent = svgContent.trim();
  if (!trimmedContent.toLowerCase().includes("<svg")) {
    return { success: false, error: "El archivo debe ser un SVG v\xE1lido" };
  }
  if (svgContent.length > 1e5) {
    return { success: false, error: "El SVG es demasiado grande (m\xE1ximo 100KB)" };
  }
  try {
    const settings = await db_default.systemSettings.findFirst();
    if (!settings) {
      return { success: false, error: "Configuraci\xF3n no encontrada" };
    }
    if (!settings.isPremium) {
      return { success: false, error: "Esta funcionalidad requiere licencia premium" };
    }
    await db_default.systemSettings.update({
      where: { id: settings.id },
      data: { logoSvg: svgContent }
    });
    revalidatePath("/settings");
    return { success: true };
  } catch (error) {
    console.error("Error uploading logo:", error);
    return { success: false, error: "Error al subir logo" };
  }
}
async function removeLogo() {
  const session = await verifySession();
  if (!session || session.role !== "master-admin" && session.role !== "admin") {
    return { success: false, error: "No autorizado" };
  }
  try {
    const settings = await db_default.systemSettings.findFirst();
    if (!settings) {
      return { success: false, error: "Configuraci\xF3n no encontrada" };
    }
    await db_default.systemSettings.update({
      where: { id: settings.id },
      data: { logoSvg: null }
    });
    revalidatePath("/settings");
    return { success: true };
  } catch (error) {
    console.error("Error removing logo:", error);
    return { success: false, error: "Error al eliminar logo" };
  }
}

// src/lib/actions/users.ts
var users_exports = {};
__export(users_exports, {
  createUser: () => createUser,
  deleteUser: () => deleteUser,
  getUserById: () => getUserById,
  getUsers: () => getUsers,
  updateUser: () => updateUser
});
init_db();
import bcrypt2 from "bcryptjs";
async function getUsers() {
  const session = await verifySession();
  if (!session) return { success: false, error: "Unauthorized" };
  try {
    const users = await db_default.user.findMany({
      orderBy: { name: "asc" }
    });
    return { success: true, data: users };
  } catch (error) {
    console.error("Error fetching users:", error);
    return { success: false, error: "Failed to fetch users" };
  }
}
async function getUserById(id) {
  const session = await verifySession();
  if (!session) return { success: false, error: "Unauthorized" };
  try {
    const user = await db_default.user.findUnique({
      where: { id }
    });
    return { success: true, data: user };
  } catch (error) {
    console.error("Error fetching user:", error);
    return { success: false, error: "Failed to fetch user" };
  }
}
async function createUser(data) {
  const session = await verifySession();
  if (!session || session.role !== "master-admin") return { success: false, error: "Unauthorized" };
  try {
    const createData = { ...data };
    if (createData.password) {
      createData.password = await bcrypt2.hash(createData.password, 10);
    }
    const user = await db_default.user.create({
      data: {
        ...createData,
        id: generateUUID(),
        assignedLocation: createData.assignedLocation || "ALL"
      }
    });
    revalidatePath("/users");
    return { success: true, data: user };
  } catch (error) {
    console.error("Error creating user:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to create user" };
  }
}
async function updateUser(id, data) {
  const session = await verifySession();
  if (!session || session.role !== "master-admin") return { success: false, error: "Unauthorized" };
  try {
    const updateData = { ...data };
    if (updateData.password) {
      updateData.password = await bcrypt2.hash(updateData.password, 10);
    }
    const user = await db_default.user.update({
      where: { id },
      data: {
        ...updateData,
        assignedLocation: updateData.assignedLocation
      }
    });
    revalidatePath("/users");
    return { success: true, data: user };
  } catch (error) {
    console.error("Error updating user:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to update user" };
  }
}
async function deleteUser(id) {
  const session = await verifySession();
  if (!session || session.role !== "master-admin") return { success: false, error: "Unauthorized" };
  try {
    await db_default.user.delete({
      where: { id }
    });
    revalidatePath("/users");
    return { success: true };
  } catch (error) {
    console.error("Error deleting user:", error);
    return { success: false, error: "Failed to delete user" };
  }
}

// src/lib/actions/variants.ts
var variants_exports = {};
__export(variants_exports, {
  createColor: () => createColor,
  createSize: () => createSize,
  generateCombinations: () => generateCombinations,
  getColors: () => getColors,
  getSizes: () => getSizes
});
init_db();
async function getSizes() {
  const session = await verifySession();
  if (!session) return { success: false, error: "Unauthorized" };
  try {
    const sizes = await db_default.size.findMany({
      where: { active: true },
      orderBy: { order: "asc" }
    });
    return { success: true, data: sizes };
  } catch (error) {
    console.error("Error fetching sizes:", error);
    return { success: false, error: "Failed to fetch sizes" };
  }
}
async function createSize(data) {
  const session = await verifySession();
  if (!session) return { success: false, error: "Unauthorized" };
  try {
    const newSize = await db_default.size.create({
      data: {
        id: generateUUID(),
        name: data.name.trim().toUpperCase(),
        order: data.order || 0
      }
    });
    revalidatePath("/settings");
    revalidatePath("/inventory/new");
    return { success: true, data: newSize };
  } catch (error) {
    if (error.code === "P2002") return { success: false, error: "La talla ya existe" };
    return { success: false, error: "Failed to create size" };
  }
}
async function getColors() {
  const session = await verifySession();
  if (!session) return { success: false, error: "Unauthorized" };
  try {
    const colors = await db_default.color.findMany({
      where: { active: true },
      orderBy: { name: "asc" }
    });
    return { success: true, data: colors };
  } catch (error) {
    console.error("Error fetching colors:", error);
    return { success: false, error: "Failed to fetch colors" };
  }
}
async function createColor(data) {
  const session = await verifySession();
  if (!session) return { success: false, error: "Unauthorized" };
  try {
    const newColor = await db_default.color.create({
      data: {
        id: generateUUID(),
        name: data.name.trim().toUpperCase(),
        hexCode: data.hexCode
      }
    });
    revalidatePath("/settings");
    revalidatePath("/inventory/new");
    return { success: true, data: newColor };
  } catch (error) {
    if (error.code === "P2002") return { success: false, error: "El color ya existe" };
    return { success: false, error: "Failed to create color" };
  }
}
async function generateCombinations(sizeIds, colorIds) {
  const session = await verifySession();
  if (!session) return { success: false, error: "Unauthorized" };
  try {
    const sizes = await db_default.size.findMany({ where: { id: { in: sizeIds } } });
    const colors = await db_default.color.findMany({ where: { id: { in: colorIds } } });
    const combinations = [];
    for (const size of sizes) {
      for (const color of colors) {
        combinations.push({
          id: generateUUID(),
          // Temp ID for the frontend table
          sizeId: size.id,
          sizeName: size.name,
          colorId: color.id,
          colorName: color.name,
          cost: 0,
          price: 0,
          stock: 0,
          barcode: ""
        });
      }
    }
    return { success: true, data: combinations };
  } catch (error) {
    console.error("Error generating combinations:", error);
    return { success: false, error: "Failed to generate combinations" };
  }
}

// src/actions/activation.ts
var activation_exports = {};
__export(activation_exports, {
  activateSystem: () => activateSystem,
  checkActivationStatus: () => checkActivationStatus
});
init_db();
async function checkActivationStatus() {
  try {
    let settings = await db_default.systemSettings.findFirst();
    console.log("Checking activation status. Settings found:", !!settings);
    if (!settings || !settings.isActivated) {
      const userCount = await db_default.user.count();
      const pieceCount = await db_default.jewelryPiece.count();
      const productCount = await db_default.product.count();
      if (userCount > 0 || pieceCount > 0 || productCount > 0) {
        console.log("Existing data detected (Users/Pieces). Auto-activating system settings...");
        if (settings) {
          settings = await db_default.systemSettings.update({
            where: { id: settings.id },
            data: {
              isActivated: true,
              activationDate: /* @__PURE__ */ new Date(),
              isPremium: settings.isPremium ?? false
            }
          });
        } else {
          settings = await db_default.systemSettings.create({
            data: {
              id: generateUUID(),
              updatedAt: /* @__PURE__ */ new Date(),
              isActivated: true,
              activationDate: /* @__PURE__ */ new Date(),
              isPremium: false,
              pharmacyName: "Mi Joyer\xEDa",
              currency: "NIO",
              jewelryLocationMode: "HOME"
            }
          });
        }
      }
    }
    return {
      isActivated: settings?.isActivated ?? false,
      isPremium: settings?.isPremium ?? false,
      error: null
    };
  } catch (error) {
    console.error("Error checking activation status:", error);
    return {
      isActivated: false,
      isPremium: false,
      error: "Error de conexi\xF3n con la base de datos"
    };
  }
}
async function activateSystem(licenseKey) {
  try {
    const cleanKey = licenseKey.trim().toUpperCase();
    if (!isValidLicense(cleanKey)) {
      return {
        success: false,
        message: "Licencia inv\xE1lida. Por favor verifique el c\xF3digo."
      };
    }
    const licenseType = getLicenseType(cleanKey);
    const isPremium = licenseType === "premium";
    const isAnnual = licenseType === "annual";
    const isBasic = licenseType === "basic";
    const isDemo = licenseType === "demo" || licenseType === "demo_15" || isDemoKey(cleanKey);
    const now = /* @__PURE__ */ new Date();
    const expirationDate = computeExpirationDate(licenseType, now);
    const settings = await db_default.systemSettings.findFirst();
    if (settings) {
      await db_default.systemSettings.update({
        where: { id: settings.id },
        data: {
          isActivated: true,
          activationDate: now,
          licenseStartDate: now,
          licenseExpirationDate: expirationDate,
          licenseStatus: isDemo ? "demo" : "registered",
          isPremium
        }
      });
    } else {
      await db_default.systemSettings.create({
        data: {
          id: generateUUID(),
          updatedAt: /* @__PURE__ */ new Date(),
          isActivated: true,
          activationDate: now,
          licenseStartDate: now,
          licenseExpirationDate: expirationDate,
          licenseStatus: isDemo ? "demo" : "registered",
          isPremium,
          pharmacyName: "Mi Joyer\xEDa",
          currency: "NIO"
        }
      });
    }
    let message = "Sistema activado correctamente.";
    let typeName = "Licencia Anual";
    if (isPremium) {
      message = "\u{1F389} \xA1Licencia Premium PERMANENTE activada! Todas las funciones han sido desbloqueadas.";
      typeName = "PREMIUM PERMANENTE";
    } else if (isAnnual) {
      message = "\xA1Licencia ANUAL activada con \xE9xito!";
      typeName = "ANUAL CL\xC1SICA";
    } else if (isBasic) {
      message = "\xA1Licencia PERMANENTE CL\xC1SICA activada con \xE9xito!";
      typeName = "PERMANENTE CL\xC1SICA";
    } else if (isDemo) {
      const demoExpiration = expirationDate.toLocaleDateString("es-ES");
      message = `\xA1Licencia Demo activada con \xE9xito! Su periodo de prueba vence el ${demoExpiration}.`;
      typeName = "DEMO (15 D\xEDas)";
    }
    sendActivationNotification(cleanKey, settings?.pharmacyName || "Nueva Instalaci\xF3n", typeName);
    revalidatePath("/");
    return {
      success: true,
      message
    };
  } catch (error) {
    console.error("Error activating system:", error);
    return {
      success: false,
      message: `Error al activar el sistema: ${error.message || "Error desconocido"}. Verifique la conexi\xF3n a la base de datos.`
    };
  }
}

// server/action-modules.ts
var actionModules = {
  "admin-auth": admin_auth_exports,
  "app-settings": app_settings_exports,
  "audit": audit_exports,
  "auth": auth_exports,
  "backup": backup_exports,
  "cash-register": cash_register_exports,
  "categories": categories_exports,
  "check-expirations": check_expirations_exports,
  "collections": collections_exports,
  "credit-notes": credit_notes_exports,
  "csv-sync": csv_sync_exports,
  "customers": customers_exports,
  "dashboard": dashboard_exports,
  "delivery-routes": delivery_routes_exports,
  "export": export_exports,
  "gold-purchase": gold_purchase_exports,
  "gold": gold_exports,
  "held-sales": held_sales_exports,
  "import-history": import_history_exports,
  "init-data": init_data_exports,
  "inventory": inventory_exports,
  "jewelry-materials": jewelry_materials_exports,
  "jewelry-production": jewelry_production_exports,
  "jewelry-reports": jewelry_reports_exports,
  "jewelry-sales": jewelry_sales_exports,
  "jewelry-services": jewelry_services_exports,
  "jewelry": jewelry_exports,
  "kardex": kardex_exports,
  "license": license_exports,
  "notifications": notifications_exports,
  "orders": orders_exports,
  "products": products_exports,
  "purchase-orders": purchase_orders_exports,
  "purchases": purchases_exports,
  "quotations": quotations_exports,
  "reports": reports_exports,
  "sales": sales_exports,
  "settings": settings_exports,
  "suppliers": suppliers_exports,
  "upload-image": upload_image_exports,
  "upload-logo": upload_logo_exports,
  "users": users_exports,
  "variants": variants_exports,
  "activation": activation_exports
};

// server/dispatcher.ts
var SESSION_COOKIE_NAME2 = "session";
var SESSION_ENCODED_KEY = new TextEncoder().encode(
  process.env.SESSION_SECRET || "default-secret-key-change-me"
);
var PUBLIC_ENDPOINTS = [
  { module: "auth", fn: "checkUsersExist" },
  { module: "auth", fn: "registerFirstUser" },
  { module: "auth", fn: "loginUser" },
  { module: "auth", fn: "resetPassword" },
  { module: "auth", fn: "logout" },
  { module: "activation", fn: "checkActivationStatus" },
  { module: "activation", fn: "activateSystem" },
  // Bootstrap: maneja internamente el caso "no autenticado" (user: null).
  { module: "init-data", fn: "getInitialAppData" }
];
function isPublicEndpoint(module, fn) {
  return PUBLIC_ENDPOINTS.some((e) => e.module === module && e.fn === fn);
}
function readSessionCookie(header) {
  if (!header) return void 0;
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    if (part.slice(0, idx).trim() === SESSION_COOKIE_NAME2) {
      return part.slice(idx + 1).trim();
    }
  }
  return void 0;
}
function buildDispatcherApp() {
  const app2 = new Hono();
  app2.get("/health", (c) => c.json({ ok: true, ts: Date.now() }));
  app2.post("/api/actions/:module/:fn", async (c) => {
    const moduleName = c.req.param("module");
    const fnName = c.req.param("fn");
    const mod = actionModules[moduleName];
    if (!mod) {
      throw new HTTPException(404, { message: `M\xF3dulo de acci\xF3n no existe: ${String(moduleName)}` });
    }
    const fn = mod[fnName];
    if (typeof fn !== "function") {
      throw new HTTPException(404, { message: `Funci\xF3n no existe: ${String(moduleName)}.${fnName}` });
    }
    if (!isPublicEndpoint(String(moduleName), fnName)) {
      const sessionCookie = readSessionCookie(c.req.header("cookie"));
      if (sessionCookie) {
        let sessionOk = false;
        try {
          await jwtVerify2(sessionCookie, SESSION_ENCODED_KEY, { algorithms: ["HS256"] });
          sessionOk = true;
        } catch {
          sessionOk = false;
        }
        if (!sessionOk) {
          throw new HTTPException(401, {
            message: "Sesi\xF3n expirada. Por favor inicie sesi\xF3n nuevamente."
          });
        }
      }
    }
    let args = [];
    try {
      const body = await c.req.json().catch(() => ({}));
      if (Array.isArray(body.args)) args = body.args;
    } catch {
      args = [];
    }
    const cookieHeader = c.req.header("cookie");
    const cookies2 = createCookieStore(cookieHeader);
    const ctx = { cookies: cookies2, cacheStore: /* @__PURE__ */ new Map() };
    let result;
    try {
      result = await runWithContext(ctx, () => fn(...args));
    } catch (err) {
      console.error(`[action] ${String(moduleName)}.${fnName} error:`, err);
      throw new HTTPException(500, {
        message: `Error ejecutando ${String(moduleName)}.${fnName}: ${err instanceof Error ? err.message : String(err)}`
      });
    }
    const setCookies = cookies2.getSetCookies();
    for (const cookie of setCookies) {
      c.header("Set-Cookie", cookie, { append: true });
    }
    return c.json(result);
  });
  return app2;
}

// server/index.ts
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { serveStatic } from "@hono/node-server/serve-static";
var __dirname = fileURLToPath(new URL(".", import.meta.url));
var PORT = Number(process.env.PORT || 9003);
var FRONTEND_DIR = resolve(__dirname, "../dist");
var app = buildDispatcherApp();
var frontendOrigin = process.env.FRONTEND_ORIGIN || "http://localhost:5173";
app.use("*", cors({
  origin: (origin) => {
    if (!origin) return "*";
    if (false) return origin;
    return frontendOrigin;
  },
  credentials: true,
  allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization", "Cookie"]
}));
if (existsSync(FRONTEND_DIR)) {
  app.use("*", serveStatic({ root: FRONTEND_DIR }));
  app.get("*", (c) => {
    const pathname = c.req.path;
    if (pathname.startsWith("/api/")) return c.notFound();
    return serveStatic({ root: FRONTEND_DIR, path: "index.html" })(c);
  });
}
serve({ fetch: app.fetch, port: PORT }, (info) => {
  console.log(`[joyeriaplus-api] escuchando en http://localhost:${info.port}`);
});
//# sourceMappingURL=index.mjs.map
