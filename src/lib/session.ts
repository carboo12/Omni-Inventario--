import 'server-only';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { cache } from 'react';
import { UserRole } from './types';

const secretKey = process.env.SESSION_SECRET;
const encodedKey = new TextEncoder().encode(secretKey || 'default-secret-key-change-me');

// Duración estricta de la sesión: 8 horas (exigido para dispositivos móviles).
export const SESSION_DURATION_HOURS = 8;
export const SESSION_DURATION_MS = SESSION_DURATION_HOURS * 60 * 60 * 1000;
export const SESSION_COOKIE_NAME = 'session';

export interface SessionPayload {
    userId: string;
    role: UserRole;
    expiresAt: Date;
}

export async function encrypt(payload: SessionPayload) {
    return new SignJWT({ ...payload })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime(`${SESSION_DURATION_HOURS}h`)
        .sign(encodedKey);
}

export async function decrypt(session: string | undefined = '') {
    try {
        const { payload } = await jwtVerify(session, encodedKey, {
            algorithms: ['HS256'],
        });
        return payload as unknown as SessionPayload;
    } catch (error) {
        return null;
    }
}

export async function createSession(userId: string, role: UserRole) {
    const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
    const session = await encrypt({ userId, role, expiresAt });
    const cookieStore = await cookies();

    // Secure solo en producción (HTTPS). En desarrollo HTTP local la cookie
    // con Secure no se envía, rompiendo el login.
    const isProd = process.env.NODE_ENV === 'production';

    cookieStore.set(SESSION_COOKIE_NAME, session, {
        httpOnly: true,
        secure: isProd,
        expires: expiresAt,
        maxAge: Math.floor(SESSION_DURATION_MS / 1000),
        sameSite: 'lax',
        path: '/',
    });
}

// cache() de React deduplicates this call within a single request lifecycle.
// Multiple Server Actions calling verifySession() in the same request will
// only decrypt the JWT ONCE — eliminating a major source of latency.
export const verifySession = cache(async () => {
    const cookieStore = await cookies();
    const cookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    const session = await decrypt(cookie);

    if (!session?.userId) {
        return null;
    }

    return { isAuth: true, userId: session.userId, role: session.role };
});

export async function deleteSession() {
    const cookieStore = await cookies();
    cookieStore.delete(SESSION_COOKIE_NAME);
}
