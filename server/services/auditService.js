import AuditLog from '../models/AuditLog.js';

/**
 * Record an audit entry. Failures are logged but never break the request:
 * the business operation has already succeeded at this point.
 * For financial writes in later modules, pass `session` so the entry commits
 * atomically with the transaction.
 */
export async function audit(req, { action, entity, entityId, before, after, meta, companyId, user, account, session }) {
  try {
    const actor = user ?? req?.user;
    await AuditLog.create(
      [
        {
          account: account ?? actor?.account,
          companyId,
          user: actor?._id,
          action,
          entity,
          entityId,
          before,
          after,
          meta,
          ip: req?.ip,
          userAgent: req?.get?.('user-agent')?.slice(0, 300),
        },
      ],
      session ? { session } : undefined
    );
  } catch (err) {
    if (session) throw err;
    console.error('Failed to write audit log', action, err);
  }
}
