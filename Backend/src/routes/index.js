import { Router } from 'express';
import authRoutes    from '../modules/auth/auth.routes.js';
import userRoutes    from '../modules/users/user.routes.js';

const router = Router();

router.use('/auth',     authRoutes);
router.use('/users',    userRoutes);

// Health check
router.get('/health', (_, res) => 
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
);

export default router;