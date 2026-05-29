import { Router } from 'express';
import authRoutes    from '../modules/auth/auth.routes.js';

const router = Router();

router.use('/auth',     authRoutes);

// Health check
router.get('/health', (_, res) => 
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
);

export default router;