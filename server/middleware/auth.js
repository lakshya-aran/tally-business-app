import User from '../models/User.js';
import AppError from '../utils/AppError.js';
import { AUTH_COOKIE, verifyAccessToken } from '../utils/tokens.js';
import { hasPermission, ROLE_RANK } from '../utils/permissions.js';

function extractToken(req) {
  const cookie = req.cookies?.[AUTH_COOKIE];
  if (cookie) return cookie;
  // Bearer tokens are accepted for API clients / tests; the browser uses the cookie.
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) return header.slice(7);
  return null;
}

/** Require a valid session. Attaches `req.user` (a lean user doc). */
export async function protect(req, _res, next) {
  const token = extractToken(req);
  if (!token) throw AppError.unauthorized();

  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch {
    throw new AppError('Your session has expired. Please sign in again.', 401, 'SESSION_EXPIRED');
  }

  const user = await User.findById(payload.sub).select('+tokenVersion').lean();
  if (!user || !user.isActive) throw AppError.unauthorized('Account not found or disabled');
  if ((user.tokenVersion ?? 0) !== payload.tv) {
    throw new AppError('Your session was revoked. Please sign in again.', 401, 'SESSION_REVOKED');
  }

  delete user.tokenVersion;
  req.user = user;
  next();
}

/** Require every listed permission. Use after `protect`. */
export function authorize(...permissions) {
  return (req, _res, next) => {
    if (!req.user) throw AppError.unauthorized();
    const missing = permissions.filter((p) => !hasPermission(req.user.role, p));
    if (missing.length) throw AppError.forbidden();
    next();
  };
}

/** Require a minimum role rank (e.g. requireRole('admin')). */
export function requireRole(minRole) {
  return (req, _res, next) => {
    if (!req.user) throw AppError.unauthorized();
    if ((ROLE_RANK[req.user.role] ?? 0) < ROLE_RANK[minRole]) throw AppError.forbidden();
    next();
  };
}
