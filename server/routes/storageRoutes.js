import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import validate from '../middleware/validate.js';
import { getUploadToken, removeFile, deleteFileSchema } from '../controllers/storageController.js';

const router = Router();
router.use(protect);

router.post('/token', getUploadToken);
router.delete('/file', validate({ body: deleteFileSchema }), removeFile);

export default router;
