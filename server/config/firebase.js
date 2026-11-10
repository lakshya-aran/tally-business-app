import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getStorage } from 'firebase-admin/storage';
import env from './env.js';
import AppError from '../utils/AppError.js';

let app = null;

function getApp() {
  if (!env.firebaseConfigured) {
    throw new AppError(
      'File storage is not configured on the server (FIREBASE_* variables missing).',
      503,
      'STORAGE_NOT_CONFIGURED'
    );
  }
  if (!app) {
    app =
      getApps()[0] ??
      initializeApp({
        credential: cert({
          projectId: env.FIREBASE_PROJECT_ID,
          clientEmail: env.FIREBASE_CLIENT_EMAIL,
          // Vercel/.env store the key with literal "\n" sequences.
          privateKey: env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        }),
        storageBucket: env.FIREBASE_STORAGE_BUCKET || `${env.FIREBASE_PROJECT_ID}.appspot.com`,
      });
  }
  return app;
}

export const firebaseAuth = () => getAuth(getApp());
export const storageBucket = () => getStorage(getApp()).bucket();
