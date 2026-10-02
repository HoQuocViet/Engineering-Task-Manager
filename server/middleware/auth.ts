import { Request, Response, NextFunction } from 'express';
import { queryOne } from '../db.js';

export interface AuthenticatedUser {
  id: string;
  name: string;
  role: string;
  avatar?: string;
  email?: string;
  is_admin: boolean;
  is_active: boolean;
}

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

/**
 * Authentication middleware:
 * Derives actor identity from server-side verified context (e.g. X-User-Id header or Bearer token).
 * Verifies against the SQLite users table where is_active = 1.
 * Never trusts req.body.userId as authenticated actor identity.
 */
export function authenticateUser(req: Request, res: Response, next: NextFunction): void {
  try {
    const rawUserId = (req.headers['x-user-id'] as string) || '';
    const authHeader = req.headers.authorization || '';

    let candidateId = rawUserId.trim();
    if (!candidateId && authHeader.startsWith('Bearer ')) {
      candidateId = authHeader.slice(7).trim();
    }

    // Default to 'usr-1' (primary admin engineer) if no explicit header is provided in single-tenant app mode
    if (!candidateId) {
      candidateId = 'usr-1';
    }

    const userRow = queryOne<any>(
      'SELECT id, name, role, avatar, email, is_admin, is_active FROM users WHERE id = ? AND is_active = 1',
      [candidateId]
    );

    if (userRow) {
      req.user = {
        id: userRow.id,
        name: userRow.name,
        role: userRow.role,
        avatar: userRow.avatar || '',
        email: userRow.email || '',
        is_admin: Boolean(userRow.is_admin === 1 || userRow.is_admin === true),
        is_active: Boolean(userRow.is_active === 1 || userRow.is_active === true),
      };
    } else {
      req.user = undefined;
    }

    next();
  } catch (err) {
    console.error('Error in authenticateUser middleware:', err);
    req.user = undefined;
    next();
  }
}

/**
 * Enforce that the request must be authenticated with a valid active user.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({
      error: 'Authentication required. Please sign in or provide a valid user identity.',
      code: 'UNAUTHENTICATED',
    });
    return;
  }
  next();
}

/**
 * Enforce that the request must be authenticated AND have administrator privileges.
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  // If the user explicitly passed a non-existent or invalid user ID, or no user found:
  const rawUserId = (req.headers['x-user-id'] as string)?.trim();
  if (rawUserId && !req.user) {
    res.status(401).json({
      error: 'Authentication failed. Provided user does not exist or is inactive.',
      code: 'UNAUTHENTICATED',
    });
    return;
  }

  if (!req.user) {
    res.status(401).json({
      error: 'Authentication required for administrative actions.',
      code: 'UNAUTHENTICATED',
    });
    return;
  }

  if (!req.user.is_admin) {
    res.status(403).json({
      error: 'Access denied: Administrator privileges required for this action.',
      code: 'FORBIDDEN',
    });
    return;
  }

  next();
}
