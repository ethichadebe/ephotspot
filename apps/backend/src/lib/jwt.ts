import jwt from 'jsonwebtoken';
import type { JwtPayload } from '@ephotspot/shared';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
const JWT_SUPER_ADMIN_SECRET = process.env.JWT_SUPER_ADMIN_SECRET || 'dev-super-secret-change-in-production';
const JWT_EXPIRY = '7d';

export function signUserToken(userId: string, type: 'user' | 'operator'): string {
  return jwt.sign({ sub: userId, type }, JWT_SECRET, { expiresIn: JWT_EXPIRY });
}

export function signSuperAdminToken(adminId: string): string {
  return jwt.sign({ sub: adminId, type: 'super_admin' }, JWT_SUPER_ADMIN_SECRET, { expiresIn: '1d' });
}

export function verifyUserToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
}

export function verifySuperAdminToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SUPER_ADMIN_SECRET) as JwtPayload;
}
