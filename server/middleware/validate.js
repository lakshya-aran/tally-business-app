import AppError from '../utils/AppError.js';

/**
 * Validate request parts with zod schemas.
 * Parsed (coerced, stripped) values replace req.body / req.params.
 * Express 5 makes req.query read-only, so parsed query lands on req.validatedQuery.
 */
export default function validate({ body, query, params } = {}) {
  return (req, _res, next) => {
    const errors = {};

    const run = (schema, value, key) => {
      if (!schema) return undefined;
      const result = schema.safeParse(value ?? {});
      if (!result.success) {
        for (const issue of result.error.issues) {
          const field = issue.path.join('.') || key;
          errors[field] ??= issue.message;
        }
        return undefined;
      }
      return result.data;
    };

    const b = run(body, req.body, 'body');
    const q = run(query, req.query, 'query');
    const p = run(params, req.params, 'params');

    if (Object.keys(errors).length) {
      throw new AppError('Please correct the highlighted fields.', 422, 'VALIDATION_ERROR', errors);
    }
    if (body) req.body = b;
    if (params) req.params = p;
    if (query) req.validatedQuery = q;
    next();
  };
}
