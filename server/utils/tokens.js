import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import env from '../config/env.js';

export const AUTH_COOKIE = 'tb_session';

export function signAccessToken(user) {
  return jwt.sign({ sub: String(user._id), tv: user.tokenVersion ?? 0 }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
    issuer: 'tally-business-api',
  });
}

export function verifyAccessToken(token) {
  return jwt.verify(token, env.JWT_SECRET, { issuer: 'tally-business-api' });
}

/** Random token sent to the user; only its SHA-256 hash is stored. */
export function createOneTimeToken() {
  const raw = crypto.randomBytes(32).toString('hex');
  return { raw, hash: hashToken(raw) };
}

export function hashToken(raw) {
  return crypto.createHash('sha256').update(String(raw)).digest('hex');
}

function cookieMaxAge() {
  const decoded = jwt.decode(jwt.sign({}, 'x', { expiresIn: env.JWT_EXPIRES_IN }));
  return (decoded.exp - decoded.iat) * 1000;
}

export function cookieOptions() {
  return {
    httpOnly: true,
    secure: env.isProd || env.COOKIE_SAMESITE === 'none',
    sameSite: env.COOKIE_SAMESITE,
    path: '/',
    maxAge: cookieMaxAge(),
  };
}

export function setAuthCookie(res, user) {
  res.cookie(AUTH_COOKIE, signAccessToken(user), cookieOptions());
}

export function clearAuthCookie(res) {
  const { maxAge, ...opts } = cookieOptions();
  res.clearCookie(AUTH_COOKIE, opts);
}
