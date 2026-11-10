import mongoose from 'mongoose';
import env from './env.js';

// NoSQL-injection defence lives at the edge: middleware/security.js strips `$`/`.`
// keys from all input and zod validators enforce primitive types. (Mongoose's
// global `sanitizeFilter` is not used because it also neuters our own `$gt` etc.)
mongoose.set('strictQuery', true);

// Cache the connection across serverless invocations (Vercel reuses warm instances).
const cache = globalThis.__mongoose ?? (globalThis.__mongoose = { conn: null, promise: null });

export async function connectDB(uri = env.MONGODB_URI) {
  if (cache.conn && mongoose.connection.readyState === 1) return cache.conn;
  if (!cache.promise) {
    cache.promise = mongoose
      .connect(uri, {
        serverSelectionTimeoutMS: 10000,
        maxPoolSize: 10,
      })
      .catch((err) => {
        cache.promise = null;
        throw err;
      });
  }
  cache.conn = await cache.promise;
  return cache.conn;
}

export async function disconnectDB() {
  await mongoose.disconnect();
  cache.conn = null;
  cache.promise = null;
}
