import { Router } from 'express';
import authRoutes    from '../modules/auth/auth.routes.js';
import userRoutes    from '../modules/users/user.routes.js';
import chatRoutes    from '../modules/chats/chat.routes.js';

const router = Router();

router.use('/auth',     authRoutes);
router.use('/users',    userRoutes);
router.use('/chats',    chatRoutes);

// Health check
router.get('/health', (_, res) => 
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
);

export default router;