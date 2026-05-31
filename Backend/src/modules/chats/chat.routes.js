import { Router } from 'express';
import {
  createPrivateChat,
  createGroupChat,
  getMyChats,
  getChatById,
  updateGroupChat,
  addMember,
  removeMember,
  deleteChat,
} from './chat.controller.js';
import { protect } from '../../middleware/auth.middleware.js';
import {
  validateCreatePrivateChat,
  validateCreateGroupChat,
  validateUpdateGroup,
  validateChatId,
  validateMemberId,
} from './chat.validation.js';

const router = Router();

// All routes are protected
router.use(protect);

router.get('/', getMyChats);
router.get('/:chatId', validateChatId, getChatById);
router.post('/private', validateCreatePrivateChat, createPrivateChat);
router.post('/group', validateCreateGroupChat, createGroupChat);
router.put('/:chatId', validateChatId, validateUpdateGroup, updateGroupChat);
router.post('/:chatId/members', validateChatId, addMember);
router.delete('/:chatId/members/:memberId', validateMemberId, removeMember);
router.delete('/:chatId', validateChatId, deleteChat);

export default router;