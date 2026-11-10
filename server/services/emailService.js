import nodemailer from 'nodemailer';
import env from '../config/env.js';

let transporter = null;
function getTransporter() {
  if (!env.smtpConfigured) return null;
  transporter ??= nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT ?? 587,
    secure: env.SMTP_SECURE === 'true',
    auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
  });
  return transporter;
}

const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

function layout({ heading, body, ctaLabel, ctaUrl, footer }) {
  return `<!doctype html><html><body style="margin:0;background:#f1f5f9;font-family:Segoe UI,Arial,sans-serif;color:#0f172a">
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
  <table width="100%" style="max-width:520px;background:#fff;border-radius:12px;padding:32px">
    <tr><td style="font-size:18px;font-weight:700;color:#0b1f3a;padding-bottom:16px">Tally Business</td></tr>
    <tr><td style="font-size:20px;font-weight:600;padding-bottom:12px">${escapeHtml(heading)}</td></tr>
    <tr><td style="font-size:15px;line-height:1.6;color:#334155;padding-bottom:24px">${body}</td></tr>
    <tr><td><a href="${ctaUrl}" style="display:inline-block;background:#1d4ed8;color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:600">${escapeHtml(ctaLabel)}</a></td></tr>
    <tr><td style="font-size:12px;color:#64748b;padding-top:24px">${escapeHtml(footer)}<br>If the button doesn't work, paste this link into your browser:<br><span style="word-break:break-all">${ctaUrl}</span></td></tr>
  </table></td></tr></table></body></html>`;
}

/**
 * Sends mail through SMTP when configured. Without SMTP (local development)
 * the message and its link are printed to the server console instead.
 * Returns { delivered, previewUrl } — previewUrl is only exposed outside production.
 */
async function send({ to, subject, html, text, link }) {
  const t = getTransporter();
  if (!t) {
    if (env.isProd) throw new Error('SMTP is not configured; cannot send email in production.');
    if (!env.isTest) console.log(`\n[email:dev] To: ${to}\n[email:dev] Subject: ${subject}\n[email:dev] Link: ${link}\n`);
    return { delivered: false, previewUrl: link };
  }
  await t.sendMail({ from: env.EMAIL_FROM, to, subject, html, text });
  return { delivered: true };
}

const appUrl = (path) => `${env.CLIENT_URL.replace(/\/$/, '')}${path}`;

export function sendVerificationEmail(user, token) {
  const link = appUrl(`/verify-email?token=${token}`);
  return send({
    to: user.email,
    subject: 'Verify your email address',
    link,
    text: `Hi ${user.name}, verify your email: ${link} (valid for 24 hours)`,
    html: layout({
      heading: `Welcome, ${user.name}`,
      body: 'Please confirm your email address to activate your account.',
      ctaLabel: 'Verify email',
      ctaUrl: link,
      footer: 'This link expires in 24 hours.',
    }),
  });
}

export function sendPasswordResetEmail(user, token) {
  const link = appUrl(`/reset-password?token=${token}`);
  return send({
    to: user.email,
    subject: 'Reset your password',
    link,
    text: `Reset your password: ${link} (valid for 1 hour). If you didn't request this, ignore this email.`,
    html: layout({
      heading: 'Reset your password',
      body: 'We received a request to reset your password. If this was not you, you can safely ignore this email.',
      ctaLabel: 'Choose a new password',
      ctaUrl: link,
      footer: 'This link expires in 1 hour.',
    }),
  });
}

export function sendInviteEmail(user, inviter, token) {
  const link = appUrl(`/reset-password?token=${token}&invite=1`);
  return send({
    to: user.email,
    subject: `${inviter.name} invited you to Tally Business`,
    link,
    text: `${inviter.name} invited you. Set your password: ${link} (valid for 48 hours)`,
    html: layout({
      heading: "You've been invited",
      body: `${escapeHtml(inviter.name)} added you to their Tally Business workspace. Set a password to get started.`,
      ctaLabel: 'Accept invitation',
      ctaUrl: link,
      footer: 'This invitation expires in 48 hours.',
    }),
  });
}
