import app from './app.js';
import env from './config/env.js';
import { connectDB } from './config/db.js';

try {
  await connectDB();
  console.log('MongoDB connected');
} catch (err) {
  console.error('Failed to connect to MongoDB:', err.message);
  process.exit(1);
}

app.listen(env.PORT, () => {
  console.log(`API listening on http://localhost:${env.PORT}/api`);
  if (!env.smtpConfigured) console.log('SMTP not configured: email links will be printed to this console.');
  if (!env.firebaseConfigured) console.log('Firebase not configured: file uploads are disabled.');
});
