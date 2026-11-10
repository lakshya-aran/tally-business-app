// Public Firebase web config. These identifiers are safe to ship to the browser;
// what a client may read/write is enforced by storage.rules, and the server-only
// service-account key lives exclusively in the API's environment.
export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.storageBucket
);

let instances = null;

/** Lazily load the Firebase SDK so it's only downloaded when a user uploads a file. */
export async function getFirebase() {
  if (!isFirebaseConfigured) {
    throw new Error('File uploads are not configured. Add the VITE_FIREBASE_* variables to client/.env.');
  }
  if (!instances) {
    const [{ initializeApp, getApps }, authMod, storageMod] = await Promise.all([
      import('firebase/app'),
      import('firebase/auth'),
      import('firebase/storage'),
    ]);
    const app = getApps()[0] ?? initializeApp(firebaseConfig);
    instances = { app, auth: authMod.getAuth(app), storage: storageMod.getStorage(app), authMod, storageMod };
  }
  return instances;
}
