import rateLimit from 'express-rate-limit';
import AppError from '../utils/AppError.js';
import env from '../config/env.js';

/**
 * Remove keys that could be interpreted as MongoDB operators ($gt, $where...)
 * or path traversal (a.b) from user input. Mutates in place so it also works on
 * Express 5's getter-only req.query.
 */
function scrub(value, depth = 0) {
  if (depth > 20 || value === null || typeof value !== 'object') return;
  for (const key of Object.keys(value)) {
    if (key.startsWith('$') || key.includes('.')) {
      delete value[key];
    } else {
      scrub(value[key], depth + 1);
    }
  }
}

export function mongoSanitize(req, _res, next) {
  scrub(req.body);
  scrub(req.params);
  scrub(req.query);
  next();
}

/**
 * CSRF defence for cookie-based auth: state-changing requests must carry a
 * custom header. Browsers can't add it cross-origin without a CORS preflight,
 * which our CORS policy rejects for unknown origins.
 */
export function requireXhrHeader(req, _res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  if (req.get('X-Requested-With') !== 'XMLHttpRequest') {
    throw new AppError('Missing X-Requested-With header', 403, 'CSRF_REJECTED');
  }
  next();
}

const limiterHandler = (_req, _res, next, options) =>
  next(new AppError(options.message, 429, 'RATE_LIMITED'));

const makeLimiter = (windowMs, limit, message) =>
  rateLimit({
    windowMs,
    limit: env.isTest ? 10_000 : limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message,
    handler: limiterHandler,
  });

export const apiLimiter = makeLimiter(15 * 60 * 1000, 1000, 'Too many requests, please slow down.');
export const authLimiter = makeLimiter(15 * 60 * 1000, 20, 'Too many attempts. Try again in 15 minutes.');
export const emailLimiter = makeLimiter(60 * 60 * 1000, 5, 'Too many email requests. Try again later.');
