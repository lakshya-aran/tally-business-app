import { test, before, after, describe } from 'node:test';
import assert from 'node:assert/strict';
import { setupDB, teardownDB, client, signUp, tokenFromLink, STRONG_PW, mongoose } from './helpers.js';

before(setupDB);
after(teardownDB);

describe('registration & email verification', () => {
  const email = 'owner@acme.test';
  const c = client();
  let link;

  test('rejects weak passwords with field errors', async () => {
    const res = await c.post('/api/auth/register').send({ name: 'Owner', email, password: 'weak', businessName: 'Acme' });
    assert.equal(res.status, 422);
    assert.equal(res.body.error.code, 'VALIDATION_ERROR');
    assert.ok(res.body.error.details.password);
  });

  test('registers and returns a dev verification link', async () => {
    const res = await c.post('/api/auth/register').send({ name: 'Owner', email, password: STRONG_PW, businessName: 'Acme' });
    assert.equal(res.status, 201);
    link = res.body.data.devLink;
    assert.match(link, /verify-email\?token=[a-f0-9]{64}/);
  });

  test('rejects duplicate email', async () => {
    const res = await c.post('/api/auth/register').send({ name: 'Owner', email, password: STRONG_PW, businessName: 'Acme' });
    assert.equal(res.status, 409);
  });

  test('blocks login until verified', async () => {
    const res = await c.post('/api/auth/login').send({ email, password: STRONG_PW });
    assert.equal(res.status, 403);
    assert.equal(res.body.error.code, 'EMAIL_NOT_VERIFIED');
  });

  test('verifies email, then logs in as admin with permissions', async () => {
    const v = await c.post('/api/auth/verify-email').send({ token: tokenFromLink(link) });
    assert.equal(v.status, 200);
    const again = await c.post('/api/auth/verify-email').send({ token: tokenFromLink(link) });
    assert.equal(again.status, 400, 'token is single-use');

    const res = await c.post('/api/auth/login').send({ email, password: STRONG_PW });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.user.role, 'admin');
    assert.equal(res.body.data.user.account.name, 'Acme');
    assert.equal(res.body.data.user.password, undefined);
    assert.ok(res.body.data.permissions.includes('users:manage'));
    const cookie = res.headers['set-cookie'].join(';');
    assert.match(cookie, /tb_session=.*HttpOnly/i);

    const me = await c.get('/api/auth/me');
    assert.equal(me.status, 200);
    assert.equal(me.body.data.user.email, email);
  });

  test('logout clears the session', async () => {
    await c.post('/api/auth/logout');
    const me = await c.get('/api/auth/me');
    assert.equal(me.status, 401);
  });
});

describe('security middleware', () => {
  test('state-changing requests without X-Requested-With are rejected', async () => {
    const res = await client().raw.post('/api/auth/login').send({ email: 'a@b.co', password: 'x' });
    assert.equal(res.status, 403);
    assert.equal(res.body.error.code, 'CSRF_REJECTED');
  });

  test('operator injection in login is neutralized', async () => {
    const res = await client().post('/api/auth/login').send({ email: { $ne: null }, password: { $ne: null } });
    assert.equal(res.status, 422);
  });

  test('locks the account after 5 failed attempts', async () => {
    const email = 'lock@acme.test';
    await signUp({ email });
    const c = client();
    for (let i = 0; i < 5; i++) await c.post('/api/auth/login').send({ email, password: 'Wrong1234' });
    const res = await c.post('/api/auth/login').send({ email, password: STRONG_PW });
    assert.equal(res.status, 423);
    assert.equal(res.body.error.code, 'ACCOUNT_LOCKED');
  });
});

describe('password reset & change', () => {
  const email = 'reset@acme.test';

  test('forgot-password gives identical responses for unknown emails', async () => {
    const res = await client().post('/api/auth/forgot-password').send({ email: 'nobody@acme.test' });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.devLink, undefined);
  });

  test('reset revokes existing sessions and sets new password', async () => {
    const session = await signUp({ email });
    const f = await client().post('/api/auth/forgot-password').send({ email });
    const token = tokenFromLink(f.body.data.devLink);

    const r = await client().post('/api/auth/reset-password').send({ token, password: 'NewPassw0rd' });
    assert.equal(r.status, 200);

    const stale = await session.get('/api/auth/me');
    assert.equal(stale.status, 401);
    assert.equal(stale.body.error.code, 'SESSION_REVOKED');

    const old = await client().post('/api/auth/login').send({ email, password: STRONG_PW });
    assert.equal(old.status, 401);
    const fresh = await client().post('/api/auth/login').send({ email, password: 'NewPassw0rd' });
    assert.equal(fresh.status, 200);
  });

  test('change-password requires the current password and keeps this device signed in', async () => {
    const c = await signUp({ email: 'change@acme.test' });
    const bad = await c.post('/api/auth/change-password').send({ currentPassword: 'Nope12345', newPassword: 'Another1Pass' });
    assert.equal(bad.status, 400);
    const good = await c.post('/api/auth/change-password').send({ currentPassword: STRONG_PW, newPassword: 'Another1Pass' });
    assert.equal(good.status, 200);
    const me = await c.get('/api/auth/me');
    assert.equal(me.status, 200);
  });

  test('profile update validates input and rejects foreign avatar paths', async () => {
    const c = await signUp({ email: 'profile@acme.test' });
    const res = await c.patch('/api/auth/me').send({ name: 'Renamed', phone: '+91 98765 43210' });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.user.name, 'Renamed');

    const foreign = await c.patch('/api/auth/me').send({ avatar: { url: 'https://x.test/a.png', path: 'users/someoneelse/avatar/a.png' } });
    assert.equal(foreign.status, 400);

    const extra = await c.patch('/api/auth/me').send({ role: 'super_admin' });
    assert.equal(extra.status, 422, 'unknown fields like role are rejected');
  });
});

describe('role-based access & tenant isolation', () => {
  let admin;
  let invitedId;
  const staffEmail = 'staff@acme.test';

  before(async () => {
    admin = await signUp({ email: 'boss@acme.test', businessName: 'Boss Co' });
  });

  test('admin invites a staff user who sets a password via the invite link', async () => {
    const inv = await admin.post('/api/users/invite').send({ name: 'Staff One', email: staffEmail, role: 'staff' });
    assert.equal(inv.status, 201);
    invitedId = inv.body.data.user._id;

    const blocked = await client().post('/api/auth/login').send({ email: staffEmail, password: STRONG_PW });
    assert.equal(blocked.status, 401, 'random password set at invite cannot be guessed');

    const token = tokenFromLink(inv.body.data.devLink);
    const set = await client().post('/api/auth/reset-password').send({ token, password: STRONG_PW });
    assert.equal(set.status, 200);
  });

  test('admin cannot invite a super admin', async () => {
    const res = await admin.post('/api/users/invite').send({ name: 'Evil', email: 'evil@acme.test', role: 'super_admin' });
    assert.equal(res.status, 422);
  });

  test('staff cannot manage users', async () => {
    const staff = client();
    await staff.post('/api/auth/login').send({ email: staffEmail, password: STRONG_PW });
    const me = await staff.get('/api/auth/me');
    assert.equal(me.body.data.user.role, 'staff');
    assert.ok(!me.body.data.permissions.includes('users:manage'));
    const res = await staff.get('/api/users');
    assert.equal(res.status, 403);
  });

  test('admin lists only users from their own account', async () => {
    const res = await admin.get('/api/users?search=acme');
    assert.equal(res.status, 200);
    const emails = res.body.data.map((u) => u.email).sort();
    assert.deepEqual(emails, ['boss@acme.test', staffEmail]);
    assert.equal(res.body.pagination.total, 2);
  });

  test('admin of another account cannot see or modify these users', async () => {
    const other = await signUp({ email: 'rival@other.test', businessName: 'Rival' });
    const res = await other.patch(`/api/users/${invitedId}`).send({ role: 'admin' });
    assert.equal(res.status, 404);
  });

  test('promoting a user revokes their session so new permissions apply', async () => {
    const staff = client();
    await staff.post('/api/auth/login').send({ email: staffEmail, password: STRONG_PW });
    const upd = await admin.patch(`/api/users/${invitedId}`).send({ role: 'accountant' });
    assert.equal(upd.status, 200);
    assert.equal((await staff.get('/api/auth/me')).status, 401);
  });

  test('deactivated users cannot sign in', async () => {
    await admin.patch(`/api/users/${invitedId}`).send({ isActive: false });
    const res = await client().post('/api/auth/login').send({ email: staffEmail, password: STRONG_PW });
    assert.equal(res.status, 403);
    assert.equal(res.body.error.code, 'ACCOUNT_DISABLED');
  });

  test('audit log records security events and cannot be modified', async () => {
    const AuditLog = mongoose.model('AuditLog');
    const actions = await AuditLog.distinct('action');
    for (const a of ['auth.register', 'auth.login', 'user.invited', 'user.updated', 'auth.locked']) {
      assert.ok(actions.includes(a), `missing ${a}`);
    }
    await assert.rejects(AuditLog.updateMany({}, { action: 'tampered' }), /immutable/);
  });
});

describe('storage', () => {
  test('returns 503 with a clear code when Firebase is not configured', async () => {
    const c = await signUp({ email: 'files@acme.test' });
    const res = await c.post('/api/storage/token');
    assert.equal(res.status, 503);
    assert.equal(res.body.error.code, 'STORAGE_NOT_CONFIGURED');
  });
});

test('health endpoint reports status', async () => {
  const res = await client().get('/api/health');
  assert.equal(res.status, 200);
  assert.equal(res.body.data.db, 'connected');
});
