import { Router } from 'express';
import * as users from '../controllers/userController.js';
import { protect, authorize } from '../middleware/auth.js';
import validate from '../middleware/validate.js';
import { emailLimiter } from '../middleware/security.js';
import { PERMISSIONS } from '../utils/permissions.js';
import { inviteUserSchema, listUsersQuery, objectIdParam, updateUserSchema } from '../validators/userValidators.js';

const router = Router();
router.use(protect, authorize(PERMISSIONS.USERS_MANAGE));

router.get('/', validate({ query: listUsersQuery }), users.listUsers);
router.post('/invite', emailLimiter, validate({ body: inviteUserSchema }), users.inviteUser);
router.patch('/:id', validate({ params: objectIdParam, body: updateUserSchema }), users.updateUser);

export default router;
