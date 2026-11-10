export function ok(res, data = null, message, status = 200) {
  const body = { success: true, data };
  if (message) body.message = message;
  return res.status(status).json(body);
}

export function created(res, data, message) {
  return ok(res, data, message, 201);
}

export function paginated(res, items, { page, limit, total }) {
  return res.json({
    success: true,
    data: items,
    pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) },
  });
}

/** Parse ?page=&limit= into safe numbers. */
export function getPagination(query, { defaultLimit = 20, maxLimit = 100 } = {}) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(maxLimit, Math.max(1, parseInt(query.limit, 10) || defaultLimit));
  return { page, limit, skip: (page - 1) * limit };
}

/** Escape a user-supplied string for safe use inside a RegExp. */
export function escapeRegex(str = '') {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
