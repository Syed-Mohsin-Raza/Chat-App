import { validationResult } from 'express-validator';
import Chat from './chat.model.js';
import { emitToUser } from '../../config/socket.js';

// ─── Helper ───────────────────────────────────────────
const handleValidation = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(422).json({ success: false, errors: errors.array() });
    return false;
  }
  return true;
};

// ─── POST /chats/private ──────────────────────────────
export const createPrivateChat = async (req, res, next) => {
  try {
    if (!handleValidation(req, res)) return;

    const { userId } = req.body;

    // Can't chat with yourself
    if (userId === req.userId) {
      return res.status(400).json({ success: false, message: "Can't chat with yourself" });
    }

    // Check if private chat already exists between these two users
    const existing = await Chat.findOne({
      type: 'private',
      'members.user': { $all: [req.userId, userId] },
    }).populate('members.user', 'username email avatar');

    if (existing) {
      return res.json({ success: true, chat: existing });
    }

    const chat = await Chat.create({
      type:      'private',
      createdBy: req.userId,
      members: [
        { user: req.userId, role: 'admin' },
        { user: userId,     role: 'member' },
      ],
    });

    const populated = await chat.populate('members.user', 'username email avatar');

    // Notify other user via socket
    await emitToUser(userId, 'chat:new', { chat: populated });

    res.status(201).json({ success: true, chat: populated });
  } catch (err) {
    next(err);
  }
};

// ─── POST /chats/group ────────────────────────────────
export const createGroupChat = async (req, res, next) => {
  try {
    if (!handleValidation(req, res)) return;

    const { name, members, description } = req.body;

    // Add creator + deduplicate
    const uniqueIds = [...new Set([req.userId, ...members])];

    const chat = await Chat.create({
      type:        'group',
      name,
      description: description || '',
      createdBy:   req.userId,
      members:     uniqueIds.map((id) => ({
        user: id,
        role: id === req.userId ? 'admin' : 'member',
      })),
    });

    const populated = await chat.populate('members.user', 'username email avatar');

    // Notify all members except creator
    const otherMembers = uniqueIds.filter((id) => id !== req.userId);
    await Promise.all(
      otherMembers.map((id) => emitToUser(id, 'chat:new', { chat: populated }))
    );

    res.status(201).json({ success: true, chat: populated });
  } catch (err) {
    next(err);
  }
};

// ─── GET /chats ───────────────────────────────────────
export const getMyChats = async (req, res, next) => {
  try {
    const chats = await Chat.find({ 'members.user': req.userId })
      .populate('members.user', 'username email avatar')
      .populate('lastMessage')
      .sort({ updatedAt: -1 }); // most recent first

    res.json({ success: true, chats });
  } catch (err) {
    next(err);
  }
};

// ─── GET /chats/:chatId ───────────────────────────────
export const getChatById = async (req, res, next) => {
  try {
    if (!handleValidation(req, res)) return;

    const chat = await Chat.findOne({
      _id:             req.params.chatId,
      'members.user':  req.userId,       // must be a member
    })
      .populate('members.user', 'username email avatar')
      .populate('lastMessage');

    if (!chat) {
      return res.status(404).json({ success: false, message: 'Chat not found' });
    }

    res.json({ success: true, chat });
  } catch (err) {
    next(err);
  }
};

// ─── PUT /chats/:chatId ───────────────────────────────
export const updateGroupChat = async (req, res, next) => {
  try {
    if (!handleValidation(req, res)) return;

    const { name, description } = req.body;

    const chat = await Chat.findOne({
      _id:            req.params.chatId,
      'members.user': req.userId,
      type:           'group',
    });

    if (!chat) {
      return res.status(404).json({ success: false, message: 'Chat not found' });
    }

    // Only admin can update
    const member = chat.members.find((m) => m.user.toString() === req.userId);
    if (member?.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Only admin can update group' });
    }

    if (name)        chat.name        = name;
    if (description) chat.description = description;
    await chat.save();

    const populated = await chat.populate('members.user', 'username email avatar');

    // Notify all members
    await Promise.all(
      chat.members.map((m) =>
        emitToUser(m.user.toString(), 'chat:updated', { chat: populated })
      )
    );

    res.json({ success: true, chat: populated });
  } catch (err) {
    next(err);
  }
};

// ─── POST /chats/:chatId/members ──────────────────────
export const addMember = async (req, res, next) => {
  try {
    if (!handleValidation(req, res)) return;

    const { userId } = req.body;

    const chat = await Chat.findOne({
      _id:            req.params.chatId,
      'members.user': req.userId,
      type:           'group',
    });

    if (!chat) {
      return res.status(404).json({ success: false, message: 'Chat not found' });
    }

    // Only admin can add
    const me = chat.members.find((m) => m.user.toString() === req.userId);
    if (me?.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Only admin can add members' });
    }

    // Already a member?
    const alreadyMember = chat.members.some((m) => m.user.toString() === userId);
    if (alreadyMember) {
      return res.status(409).json({ success: false, message: 'User already in group' });
    }

    chat.members.push({ user: userId, role: 'member' });
    await chat.save();

    const populated = await chat.populate('members.user', 'username email avatar');

    // Notify new member
    await emitToUser(userId, 'chat:new', { chat: populated });

    res.json({ success: true, chat: populated });
  } catch (err) {
    next(err);
  }
};

// ─── DELETE /chats/:chatId/members/:memberId ──────────
export const removeMember = async (req, res, next) => {
  try {
    if (!handleValidation(req, res)) return;

    const { chatId, memberId } = req.params;

    const chat = await Chat.findOne({
      _id:            chatId,
      'members.user': req.userId,
      type:           'group',
    });

    if (!chat) {
      return res.status(404).json({ success: false, message: 'Chat not found' });
    }

    // Admin check OR removing yourself (leave group)
    const me = chat.members.find((m) => m.user.toString() === req.userId);
    if (me?.role !== 'admin' && memberId !== req.userId) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    chat.members = chat.members.filter((m) => m.user.toString() !== memberId);
    await chat.save();

    // Notify removed member
    await emitToUser(memberId, 'chat:removed', { chatId });

    res.json({ success: true, message: 'Member removed' });
  } catch (err) {
    next(err);
  }
};

// ─── DELETE /chats/:chatId ────────────────────────────
export const deleteChat = async (req, res, next) => {
  try {
    if (!handleValidation(req, res)) return;

    const chat = await Chat.findOne({
      _id:            req.params.chatId,
      'members.user': req.userId,
    });

    if (!chat) {
      return res.status(404).json({ success: false, message: 'Chat not found' });
    }

    // Only creator can delete
    if (chat.createdBy.toString() !== req.userId) {
      return res.status(403).json({ success: false, message: 'Only creator can delete chat' });
    }

    await chat.deleteOne();

    // Notify all members
    await Promise.all(
      chat.members.map((m) =>
        emitToUser(m.user.toString(), 'chat:deleted', { chatId: req.params.chatId })
      )
    );

    res.json({ success: true, message: 'Chat deleted' });
  } catch (err) {
    next(err);
  }
};