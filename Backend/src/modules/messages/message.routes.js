import { Router } from 'express';
import {
  sendMessage,
  sendMediaMessage,
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
import { handleUploadError, uploadAttachment } from '../../middleware/upload.middleware.js';

const router = Router();

router.use(protect);

router.post('/upload', uploadAttachment, handleUploadError, sendMediaMessage); // Separate route for media messages

router.post('/', validateSendMessage, sendMessage);
router.get('/:chatId', validateGetMessages, getMessages);
router.put('/:messageId/read', validateMessageId, markAsRead);
router.delete('/:messageId', validateMessageId, deleteMessage);

export default router;