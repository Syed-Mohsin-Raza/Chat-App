import { Router } from 'express';
import {
  sendMessage,
  getMessages,
  markAsRead,
  deleteMessage,
} from './message.controller.js';
import { protect } from '../../middleware/auth.middleware.js';
import {
  validateSendMessage,
  validateGetMessages,
  validateMessageId,
} from './message.validation.js';

const router = Router();

router.use(protect);

router.post('/', validateSendMessage, sendMessage);
router.get('/:chatId', validateGetMessages, getMessages);
router.put('/:messageId/read', validateMessageId, markAsRead);
router.delete('/:messageId', validateMessageId, deleteMessage);

export default router;