import { Router } from 'express';
import mongoose from 'mongoose';
import authRoutes from './authRoutes.js';
import userRoutes from './userRoutes.js';
import storageRoutes from './storageRoutes.js';
import env from '../config/env.js';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({
    success: true,
    data: {
      status: 'ok',
      db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
      storage: env.firebaseConfigured ? 'configured' : 'not_configured',
      email: env.smtpConfigured ? 'smtp' : 'console',
      time: new Date().toISOString(),
    },
  });
});

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/storage', storageRoutes);

export default router;
