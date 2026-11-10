import mongoose from 'mongoose';
import User, { LOCK_MINUTES, MAX_FAILED_LOGINS } from '../models/User.js';
import Account from '../models/Account.js';
import AppError from '../utils/AppError.js';
import { ok, created } from '../utils/apiResponse.js';
import { hashToken, setAuthCookie, clearAuthCookie } from '../utils/tokens.js';
import { permissionsFor, ROLES } from '../utils/permissions.js';
import { audit } from '../services/auditService.js';
import { sendVerificationEmail, sendPasswordResetEmail } from '../services/emailService.js';
import { canAccessPath, deleteFileQuietly } from '../services/storageService.js';
import env from '../config/env.js';

const GENERIC_EMAIL_MSG = 'If an account exists for that email, we have sent instructions to it.';

/** Shape returned to the client for the signed-in user. */
async function sessionPayload(userId) {
  // Sensitive fields are `select: false` on the schema, so they are not loaded here.
  const user = await User.findById(userId).populate('account', 'name').select('-__v').lean();
  return { user, permissions: permissionsFor(user.role) };
}

/** Only expose dev email links when SMTP isn't set up and we're not in production. */
const devLink = (result) => (!env.isProd && result?.previewUrl ? { devLink: result.previewUrl } : {});

export async function register(req, res) {
  const { name, email, password, businessName } = req.body;

  if (await User.exists({ email })) {
    throw new AppError('An account with this email already exists.', 409, 'DUPLICATE', {
      email: 'Already registered',
    });
  }

  // Create the tenant and its first admin together.
  const accountId = new mongoose.Types.ObjectId();
  const user = new User({ name, email, password, role: ROLES.ADMIN, account: accountId });
  const token = user.createEmailVerificationToken();
  await Account.create({ _id: accountId, name: businessName, owner: user._id });
  try {
    await user.save();
  } catch (err) {
    await Account.deleteOne({ _id: accountId });
    throw err;
  }

  const mail = await sendVerificationEmail(user, token);
  await audit(req, { action: 'auth.register', entity: 'User', entityId: user._id, user });

  return created(
    res,
    { email: user.email, ...devLink(mail) },
    'Account created. Check your email to verify your address before signing in.'
  );
}

export async function login(req, res) {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select('+password +tokenVersion +failedLoginAttempts +lockUntil');

  const invalid = new AppError('Incorrect email or password.', 401, 'INVALID_CREDENTIALS');
  if (!user) throw invalid;

  if (user.isLocked()) {
    const mins = Math.ceil((user.lockUntil - Date.now()) / 60000);
    throw new AppError(`Too many failed attempts. Try again in ${mins} minute(s).`, 423, 'ACCOUNT_LOCKED');
  }

  if (!(await user.comparePassword(password))) {
    user.failedLoginAttempts = (user.failedLoginAttempts ?? 0) + 1;
    if (user.failedLoginAttempts >= MAX_FAILED_LOGINS) {
      user.lockUntil = new Date(Date.now() + LOCK_MINUTES * 60 * 1000);
      user.failedLoginAttempts = 0;
      await audit(req, { action: 'auth.locked', entity: 'User', entityId: user._id, user });
    }
    await user.save({ validateModifiedOnly: true });
    throw invalid;
  }

  if (!user.isActive) throw new AppError('This account has been deactivated. Contact your administrator.', 403, 'ACCOUNT_DISABLED');
  if (user.mustSetPassword) throw new AppError('Please use the link in your invitation email to set a password.', 403, 'PASSWORD_NOT_SET');
  if (!user.isEmailVerified) {
    throw new AppError('Please verify your email address before signing in.', 403, 'EMAIL_NOT_VERIFIED');
  }

  user.failedLoginAttempts = 0;
  user.lockUntil = undefined;
  user.lastLoginAt = new Date();
  await user.save({ validateModifiedOnly: true });

  setAuthCookie(res, user);
  await audit(req, { action: 'auth.login', entity: 'User', entityId: user._id, user });
  return ok(res, await sessionPayload(user._id), 'Signed in successfully');
}

export async function logout(req, res) {
  clearAuthCookie(res);
  return ok(res, null, 'Signed out');
}

/** Revoke every session for this user (all devices). */
export async function logoutAll(req, res) {
  await User.updateOne({ _id: req.user._id }, { $inc: { tokenVersion: 1 } });
  clearAuthCookie(res);
  await audit(req, { action: 'auth.logout_all', entity: 'User', entityId: req.user._id });
  return ok(res, null, 'Signed out of all devices');
}

export async function me(req, res) {
  return ok(res, await sessionPayload(req.user._id));
}

export async function verifyEmail(req, res) {
  const user = await User.findOne({
    emailVerificationToken: hashToken(req.body.token),
    emailVerificationExpires: { $gt: new Date() },
  });
  if (!user) throw new AppError('This verification link is invalid or has expired.', 400, 'INVALID_TOKEN');

  user.isEmailVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpires = undefined;
  await user.save({ validateModifiedOnly: true });
  await audit(req, { action: 'auth.email_verified', entity: 'User', entityId: user._id, user });
  return ok(res, null, 'Email verified. You can now sign in.');
}

export async function resendVerification(req, res) {
  const user = await User.findOne({ email: req.body.email });
  let mail;
  if (user && !user.isEmailVerified && !user.mustSetPassword) {
    const token = user.createEmailVerificationToken();
    await user.save({ validateModifiedOnly: true });
    mail = await sendVerificationEmail(user, token);
  }
  return ok(res, devLink(mail), GENERIC_EMAIL_MSG);
}

export async function forgotPassword(req, res) {
  const user = await User.findOne({ email: req.body.email, isActive: true });
  let mail;
  if (user) {
    const token = user.createPasswordResetToken(1);
    await user.save({ validateModifiedOnly: true });
    mail = await sendPasswordResetEmail(user, token);
    await audit(req, { action: 'auth.password_reset_requested', entity: 'User', entityId: user._id, user });
  }
  // Same response either way so the endpoint can't be used to discover accounts.
  return ok(res, devLink(mail), GENERIC_EMAIL_MSG);
}

export async function resetPassword(req, res) {
  const user = await User.findOne({
    passwordResetToken: hashToken(req.body.token),
    passwordResetExpires: { $gt: new Date() },
  }).select('+tokenVersion');
  if (!user) throw new AppError('This reset link is invalid or has expired.', 400, 'INVALID_TOKEN');

  const wasInvite = user.mustSetPassword;
  user.password = req.body.password;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  user.mustSetPassword = false;
  user.isEmailVerified = true; // they proved control of the inbox
  user.failedLoginAttempts = 0;
  user.lockUntil = undefined;
  user.tokenVersion = (user.tokenVersion ?? 0) + 1; // revoke existing sessions
  await user.save();

  await audit(req, {
    action: wasInvite ? 'auth.invite_accepted' : 'auth.password_reset',
    entity: 'User',
    entityId: user._id,
    user,
  });
  return ok(res, null, wasInvite ? 'Password set. You can now sign in.' : 'Password updated. You can now sign in.');
}

export async function updateProfile(req, res) {
  const user = await User.findById(req.user._id);
  const before = { name: user.name, phone: user.phone, avatar: user.avatar?.path };
  const { name, phone, avatar } = req.body;

  if (name !== undefined) user.name = name;
  if (phone !== undefined) user.phone = phone || undefined;

  let oldAvatarPath;
  if (avatar !== undefined) {
    if (avatar && !canAccessPath(req.user, avatar.path)) {
      throw AppError.badRequest('Avatar must be uploaded to your own storage folder');
    }
    oldAvatarPath = user.avatar?.path;
    user.avatar = avatar ?? undefined;
  }

  await user.save({ validateModifiedOnly: true });
  if (oldAvatarPath && oldAvatarPath !== user.avatar?.path) {
    await deleteFileQuietly(req.user, oldAvatarPath);
  }

  await audit(req, {
    action: 'user.profile_updated',
    entity: 'User',
    entityId: user._id,
    before,
    after: { name: user.name, phone: user.phone, avatar: user.avatar?.path },
  });
  return ok(res, await sessionPayload(user._id), 'Profile updated');
}

export async function changePassword(req, res) {
  const user = await User.findById(req.user._id).select('+password +tokenVersion');
  if (!(await user.comparePassword(req.body.currentPassword))) {
    throw new AppError('Current password is incorrect.', 400, 'VALIDATION_ERROR', {
      currentPassword: 'Incorrect password',
    });
  }
  user.password = req.body.newPassword;
  user.tokenVersion = (user.tokenVersion ?? 0) + 1; // sign out other devices
  await user.save();

  setAuthCookie(res, user); // keep this device signed in
  await audit(req, { action: 'auth.password_changed', entity: 'User', entityId: user._id });
  return ok(res, null, 'Password changed. Other devices have been signed out.');
}
