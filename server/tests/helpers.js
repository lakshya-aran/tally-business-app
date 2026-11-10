// Test bootstrap: must be imported before app code so env is set first.
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET ||= 'test-secret-test-secret-test-secret-123';
process.env.MONGODB_URI = process.env.TEST_MONGODB_URI || 'mongodb://127.0.0.1:27017/tally_business_test';
process.env.CLIENT_URL = 'http://localhost:5173';
process.env.BCRYPT_ROUNDS = '4';
// Make sure tests never hit real services configured in a developer's .env.
for (const k of ['SMTP_HOST', 'FIREBASE_PROJECT_ID', 'FIREBASE_CLIENT_EMAIL', 'FIREBASE_PRIVATE_KEY']) process.env[k] = '';

const { default: request } = await import('supertest');
const { default: app } = await import('../app.js');
const { connectDB, disconnectDB } = await import('../config/db.js');
const { default: mongoose } = await import('mongoose');

export { app, mongoose };

export async function setupDB() {
  await connectDB();
  await mongoose.connection.dropDatabase();
}

export async function teardownDB() {
  await mongoose.connection.dropDatabase();
  await disconnectDB();
}

/** supertest agent that keeps cookies and sends the CSRF header. */
export function client() {
  const agent = request.agent(app);
  const wrap = (method) => (url) => agent[method](url).set('X-Requested-With', 'XMLHttpRequest');
  return { get: wrap('get'), post: wrap('post'), patch: wrap('patch'), delete: wrap('delete'), raw: agent };
}

export const tokenFromLink = (link) => new URL(link).searchParams.get('token');

export const STRONG_PW = 'Passw0rdStrong';

/** Register + verify + log in. Returns the logged-in client. */
export async function signUp({ email, name = 'Test User', businessName = 'Acme Traders', password = STRONG_PW }) {
  const c = client();
  const reg = await c.post('/api/auth/register').send({ name, email, password, businessName });
  if (reg.status !== 201) throw new Error(`register failed: ${JSON.stringify(reg.body)}`);
  await c.post('/api/auth/verify-email').send({ token: tokenFromLink(reg.body.data.devLink) });
  const login = await c.post('/api/auth/login').send({ email, password });
  if (login.status !== 200) throw new Error(`login failed: ${JSON.stringify(login.body)}`);
  return c;
}
