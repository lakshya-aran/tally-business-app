import api from '../services/api';
import { getFirebase, isFirebaseConfigured } from './config';

const MB = 1024 * 1024;
const IMAGES = ['image/jpeg', 'image/png', 'image/webp'];
const PDF = ['application/pdf'];
const OFFICE = [
  'text/csv',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

/**
 * Upload kinds: allowed types, max size and destination folder.
 * Keep in sync with /storage.rules (the rules are the real enforcement).
 * SVG is intentionally excluded: it can carry scripts.
 */
export const UPLOAD_KINDS = {
  avatar: { types: IMAGES, maxSize: 2 * MB, folder: ({ userId }) => `users/${userId}/avatar` },
  companyLogo: { types: IMAGES, maxSize: 2 * MB, folder: ({ accountId, companyId }) => `accounts/${accountId}/companies/${companyId}/logos` },
  productImage: { types: IMAGES, maxSize: 5 * MB, folder: ({ accountId, companyId }) => `accounts/${accountId}/companies/${companyId}/products` },
  invoicePdf: { types: PDF, maxSize: 10 * MB, folder: ({ accountId, companyId }) => `accounts/${accountId}/companies/${companyId}/invoices` },
  expenseReceipt: { types: [...IMAGES, ...PDF], maxSize: 10 * MB, folder: ({ accountId, companyId }) => `accounts/${accountId}/companies/${companyId}/expenses` },
  document: { types: [...IMAGES, ...PDF, ...OFFICE], maxSize: 20 * MB, folder: ({ accountId, companyId }) => `accounts/${accountId}/companies/${companyId}/documents` },
};

const EXT = {
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'application/pdf': 'pdf', 'text/csv': 'csv',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
};

const formatSize = (bytes) => (bytes >= MB ? `${(bytes / MB).toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`);

export { isFirebaseConfigured };

/** Returns an error message, or null if the file is acceptable for this kind. */
export function validateFile(file, kind) {
  const spec = UPLOAD_KINDS[kind];
  if (!spec) return `Unknown upload type "${kind}"`;
  if (!file) return 'Choose a file to upload';
  if (!spec.types.includes(file.type)) {
    const allowed = [...new Set(spec.types.map((t) => EXT[t].toUpperCase()))].join(', ');
    return `Unsupported file type. Allowed: ${allowed}`;
  }
  if (file.size > spec.maxSize) return `File is too large (${formatSize(file.size)}). Maximum is ${formatSize(spec.maxSize)}.`;
  return null;
}

/**
 * Sign in to Firebase with a custom token minted by our API, so storage.rules
 * can see which user/account is uploading. Re-signs if a different user is cached.
 */
async function ensureFirebaseSession(userId) {
  const { auth, authMod } = await getFirebase();
  if (auth.currentUser?.uid === String(userId)) return;
  const { data } = await api.post('/storage/token');
  await authMod.signInWithCustomToken(auth, data.data.token);
}

/**
 * Upload a file directly to Firebase Storage.
 * @param {File} file
 * @param {{ kind: keyof UPLOAD_KINDS, user: object, companyId?: string, onProgress?: (pct:number)=>void, signal?: AbortSignal }} opts
 * @returns {Promise<{ url: string, path: string, name: string, size: number, contentType: string }>}
 */
export async function uploadFile(file, { kind, user, companyId, onProgress, signal }) {
  const error = validateFile(file, kind);
  if (error) throw new Error(error);

  await ensureFirebaseSession(user._id);
  const { storage, storageMod } = await getFirebase();

  const folder = UPLOAD_KINDS[kind].folder({
    userId: user._id,
    accountId: user.account?._id ?? user.account,
    companyId,
  });
  const random = crypto.getRandomValues(new Uint32Array(1))[0].toString(36);
  const path = `${folder}/${Date.now()}-${random}.${EXT[file.type]}`;
  const objectRef = storageMod.ref(storage, path);

  const task = storageMod.uploadBytesResumable(objectRef, file, {
    contentType: file.type,
    customMetadata: { originalName: file.name.slice(0, 200) },
  });
  signal?.addEventListener('abort', () => task.cancel());

  await new Promise((resolve, reject) => {
    task.on(
      'state_changed',
      (snap) => onProgress?.(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
      (err) => reject(new Error(friendlyStorageError(err))),
      resolve
    );
  });

  const url = await storageMod.getDownloadURL(objectRef);
  return { url, path, name: file.name, size: file.size, contentType: file.type };
}

/** Delete via the API (server verifies the path belongs to this user/account). */
export async function deleteFile(path) {
  await api.delete('/storage/file', { data: { path } });
}

/** Clear the cached Firebase session on logout. Safe to call if never initialized. */
export async function signOutStorage() {
  if (!isFirebaseConfigured) return;
  try {
    const { auth, authMod } = await getFirebase();
    if (auth.currentUser) await authMod.signOut(auth);
  } catch {
    /* ignore */
  }
}

function friendlyStorageError(err) {
  switch (err?.code) {
    case 'storage/unauthorized':
      return 'You do not have permission to upload this file.';
    case 'storage/canceled':
      return 'Upload cancelled.';
    case 'storage/quota-exceeded':
      return 'Storage quota exceeded. Contact your administrator.';
    case 'storage/retry-limit-exceeded':
      return 'Upload timed out. Check your connection and try again.';
    default:
      return err?.message || 'Upload failed. Please try again.';
  }
}
