import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { ROLES } from '../utils/permissions.js';
import { createOneTimeToken } from '../utils/tokens.js';

// 12 in production; tests lower it via BCRYPT_ROUNDS to stay fast.
const BCRYPT_ROUNDS = Number(process.env.BCRYPT_ROUNDS) || 12;
export const MAX_FAILED_LOGINS = 5;
export const LOCK_MINUTES = 15;

const fileRefSchema = new mongoose.Schema(
  { url: { type: String, trim: true }, path: { type: String, trim: true } },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Invalid email address'],
    },
    password: { type: String, required: true, select: false },
    role: { type: String, enum: Object.values(ROLES), default: ROLES.STAFF, index: true },
    account: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', required: true, index: true },
    phone: { type: String, trim: true, maxlength: 20 },
    avatar: { type: fileRefSchema, default: undefined },

    isActive: { type: Boolean, default: true },
    isEmailVerified: { type: Boolean, default: false },
    // True for invited users who have not yet chosen their password.
    mustSetPassword: { type: Boolean, default: false },

    emailVerificationToken: { type: String, select: false },
    emailVerificationExpires: { type: Date, select: false },
    passwordResetToken: { type: String, select: false },
    passwordResetExpires: { type: Date, select: false },

    // Incrementing this invalidates every JWT issued before (logout-all, password change).
    tokenVersion: { type: Number, default: 0, select: false },
    failedLoginAttempts: { type: Number, default: 0, select: false },
    lockUntil: { type: Date, select: false },
    lastLoginAt: Date,
    passwordChangedAt: Date,
  },
  { timestamps: true }
);

userSchema.index({ emailVerificationToken: 1 }, { sparse: true });
userSchema.index({ passwordResetToken: 1 }, { sparse: true });

userSchema.pre('save', async function hashPassword() {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, BCRYPT_ROUNDS);
  if (!this.isNew) this.passwordChangedAt = new Date();
});

userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.methods.isLocked = function isLocked() {
  return Boolean(this.lockUntil && this.lockUntil > Date.now());
};

userSchema.methods.createEmailVerificationToken = function createEmailVerificationToken() {
  const { raw, hash } = createOneTimeToken();
  this.emailVerificationToken = hash;
  this.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
  return raw;
};

userSchema.methods.createPasswordResetToken = function createPasswordResetToken(hours = 1) {
  const { raw, hash } = createOneTimeToken();
  this.passwordResetToken = hash;
  this.passwordResetExpires = new Date(Date.now() + hours * 60 * 60 * 1000);
  return raw;
};

userSchema.set('toJSON', {
  versionKey: false,
  transform(_doc, ret) {
    delete ret.password;
    delete ret.emailVerificationToken;
    delete ret.emailVerificationExpires;
    delete ret.passwordResetToken;
    delete ret.passwordResetExpires;
    delete ret.tokenVersion;
    delete ret.failedLoginAttempts;
    delete ret.lockUntil;
    return ret;
  },
});

export default mongoose.models.User || mongoose.model('User', userSchema);
