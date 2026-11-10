import { z } from 'zod';
import { ok } from '../utils/apiResponse.js';
import { createUploadToken, deleteFile } from '../services/storageService.js';
import { audit } from '../services/auditService.js';

export const deleteFileSchema = z.object({ path: z.string().min(1).max(512) });

export async function getUploadToken(req, res) {
  const token = await createUploadToken(req.user);
  return ok(res, { token });
}

export async function removeFile(req, res) {
  await deleteFile(req.user, req.body.path);
  await audit(req, { action: 'storage.file_deleted', entity: 'File', meta: { path: req.body.path } });
  return ok(res, null, 'File deleted');
}
