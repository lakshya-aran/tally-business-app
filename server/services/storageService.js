import { firebaseAuth, storageBucket } from '../config/firebase.js';
import AppError from '../utils/AppError.js';

/**
 * Storage layout (enforced again by storage.rules):
 *   users/{userId}/avatar/{file}
 *   accounts/{accountId}/companies/{companyId}/{logos|products|invoices|expenses|documents}/{file}
 *
 * The browser uploads directly to Firebase Storage using a short-lived Firebase
 * custom token minted here. The token's uid is our user id and its `acct` claim
 * is the account id, so storage.rules can confine each user to their own folders.
 * The service-account key never leaves the server.
 */
export async function createUploadToken(user) {
  return firebaseAuth().createCustomToken(String(user._id), {
    acct: String(user.account),
    role: user.role,
  });
}

/** True if the user is allowed to manage the object at this path. */
export function canAccessPath(user, path) {
  if (typeof path !== 'string' || path.includes('..') || path.startsWith('/')) return false;
  const uid = String(user._id);
  const acct = String(user.account);
  return path.startsWith(`users/${uid}/`) || path.startsWith(`accounts/${acct}/`);
}

export async function deleteFile(user, path) {
  if (!canAccessPath(user, path)) throw AppError.forbidden('You cannot delete this file');
  try {
    await storageBucket().file(path).delete();
  } catch (err) {
    if (err?.code === 404) return; // already gone: treat as success
    throw err;
  }
}

/** Best-effort removal of a replaced file (e.g. old avatar). Never throws. */
export async function deleteFileQuietly(user, path) {
  if (!path) return;
  try {
    await deleteFile(user, path);
  } catch (err) {
    if (err?.code !== 'STORAGE_NOT_CONFIGURED') console.warn('Could not delete old file', path, err.message);
  }
}
