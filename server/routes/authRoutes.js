import { Router } from 'express';
import * as auth from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';
import validate from '../middleware/validate.js';
import { authLimiter, emailLimiter } from '../middleware/security.js';
import {
  registerSchema,
  loginSchema,
  emailOnlySchema,
  tokenSchema,
  resetPasswordSchema,
  changePasswordSchema,
  updateProfileSchema,
} from '../validators/authValidators.js';

const router = Router();

router.post('/register', authLimiter, validate({ body: registerSchema }), auth.register);
router.post('/login', authLimiter, validate({ body: loginSchema }), auth.login);
router.post('/logout', auth.logout);
router.post('/logout-all', protect, auth.logoutAll);

router.post('/verify-email', authLimiter, validate({ body: tokenSchema }), auth.verifyEmail);
router.post('/resend-verification', emailLimiter, validate({ body: emailOnlySchema }), auth.resendVerification);
router.post('/forgot-password', emailLimiter, validate({ body: emailOnlySchema }), auth.forgotPassword);
router.post('/reset-password', authLimiter, validate({ body: resetPasswordSchema }), auth.resetPassword);

router.get('/me', protect, auth.me);
router.patch('/me', protect, validate({ body: updateProfileSchema }), auth.updateProfile);
router.post('/change-password', protect, authLimiter, validate({ body: changePasswordSchema }), auth.changePassword);

export default router;
