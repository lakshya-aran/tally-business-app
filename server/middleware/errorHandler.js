import mongoose from 'mongoose';
import AppError from '../utils/AppError.js';
import env from '../config/env.js';

export function notFound(req, _res, next) {
  next(AppError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
}

function normalize(err) {
  if (err instanceof AppError) return err;

  if (err instanceof mongoose.Error.ValidationError) {
    const details = Object.fromEntries(
      Object.entries(err.errors).map(([k, v]) => [k, v.message])
    );
    return new AppError('Please correct the highlighted fields.', 422, 'VALIDATION_ERROR', details);
  }
  if (err instanceof mongoose.Error.CastError) {
    return AppError.badRequest(`Invalid value for ${err.path}`);
  }
  if (err?.code === 11000) {
    const field = Object.keys(err.keyValue ?? err.keyPattern ?? {})[0] ?? 'field';
    return new AppError(`A record with this ${field} already exists.`, 409, 'DUPLICATE', {
      [field]: 'Already in use',
    });
  }
  if (err?.type === 'entity.parse.failed') return AppError.badRequest('Malformed JSON body');
  if (err?.type === 'entity.too.large') return new AppError('Request body too large', 413, 'PAYLOAD_TOO_LARGE');

  const wrapped = new AppError('Something went wrong. Please try again.', 500, 'INTERNAL_ERROR');
  wrapped.isOperational = false;
  wrapped.original = err;
  return wrapped;
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, _next) {
  const e = normalize(err);
  if (!e.isOperational) {
    console.error(`[${req.method} ${req.originalUrl}]`, e.original ?? err);
  } else if (e.statusCode >= 500 && !env.isTest) {
    console.warn(`[${req.method} ${req.originalUrl}] ${e.code}: ${e.message}`);
  }
  const body = { success: false, error: { code: e.code, message: e.message } };
  if (e.details) body.error.details = e.details;
  if (!env.isProd && e.original) body.error.debug = String(e.original?.stack ?? e.original);
  res.status(e.statusCode).json(body);
}
