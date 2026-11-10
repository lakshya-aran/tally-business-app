import crypto from 'node:crypto';
import User from '../models/User.js';
import AppError from '../utils/AppError.js';
import { ok, created, paginated, getPagination, escapeRegex } from '../utils/apiResponse.js';
import { ROLE_RANK, ROLES } from '../utils/permissions.js';
import { audit } from '../services/auditService.js';
import { sendInviteEmail } from '../services/emailService.js';
import env from '../config/env.js';

/** Users visible to the requester: their own account, or everyone for super admins. */
function scope(req) {
  return req.user.role === ROLES.SUPER_ADMIN ? {} : { account: req.user.account };
}

async function findManageable(req, id) {
  const target = await User.findOne({ _id: id, ...scope(req) });
  if (!target) throw AppError.notFound('User not found');
  return target;
}

export async function listUsers(req, res) {
  const q = req.validatedQuery;
  const { page, limit, skip } = getPagination(q);
  const filter = { ...scope(req) };
  if (q.role) filter.role = q.role;
  if (q.status) filter.isActive = q.status === 'active';
  if (q.search) {
    const rx = new RegExp(escapeRegex(q.search), 'i');
    filter.$or = [{ name: rx }, { email: rx }];
  }

  const [items, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    User.countDocuments(filter),
  ]);
  return paginated(res, items, { page, limit, total });
}

export async function inviteUser(req, res) {
  const { name, email, role } = req.body;
  if (ROLE_RANK[role] > ROLE_RANK[req.user.role]) throw AppError.forbidden('You cannot assign a role higher than your own');
  if (await User.exists({ email })) {
    throw new AppError('A user with this email already exists.', 409, 'DUPLICATE', { email: 'Already registered' });
  }

  const user = new User({
    name,
    email,
    role,
    account: req.user.account,
    // Unusable random password until the invitee sets their own.
    password: crypto.randomBytes(32).toString('hex'),
    mustSetPassword: true,
  });
  const token = user.createPasswordResetToken(48);
  await user.save();

  const mail = await sendInviteEmail(user, req.user, token);
  await audit(req, { action: 'user.invited', entity: 'User', entityId: user._id, after: { email, role } });

  return created(
    res,
    { user: user.toJSON(), ...(!env.isProd && mail.previewUrl ? { devLink: mail.previewUrl } : {}) },
    `Invitation sent to ${email}`
  );
}

export async function updateUser(req, res) {
  const target = await findManageable(req, req.params.id);
  if (String(target._id) === String(req.user._id)) throw AppError.forbidden('You cannot change your own role or status');
  if (ROLE_RANK[target.role] > ROLE_RANK[req.user.role]) throw AppError.forbidden('You cannot modify a user with a higher role');
  if (req.body.role && ROLE_RANK[req.body.role] > ROLE_RANK[req.user.role]) {
    throw AppError.forbidden('You cannot assign a role higher than your own');
  }

  const before = { role: target.role, isActive: target.isActive };
  if (req.body.role) target.role = req.body.role;
  if (req.body.isActive !== undefined) target.isActive = req.body.isActive;
  await target.save({ validateModifiedOnly: true });

  // Revoke sessions on deactivation or role change so new permissions apply immediately.
  await User.updateOne({ _id: target._id }, { $inc: { tokenVersion: 1 } });

  await audit(req, {
    action: 'user.updated',
    entity: 'User',
    entityId: target._id,
    before,
    after: { role: target.role, isActive: target.isActive },
  });
  return ok(res, target.toJSON(), 'User updated');
}
