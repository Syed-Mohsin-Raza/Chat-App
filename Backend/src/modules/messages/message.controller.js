import { validationResult } from 'express-validator';
import Message from './message.model.js';
import Chat    from '../chats/chat.model.js';
import { emitToUser } from '../../config/socket.js';

const handleValidation = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(422).json({ success: false, errors: errors.array() });
    return false;
  }
  return true;
};

// POST /messages 
export const sendMessage = async (req, res, next) => {
  try {
    if (!handleValidation(req, res)) return;

    const { chatId, content, type = 'text', replyTo } = req.body;

    const chat = await Chat.findOne({
      _id:            chatId,
      'members.user': req.userId,
    }).select('members');                          

    if (!chat) {
      return res.status(404).json({ success: false, message: 'Chat not found' });
    }

    const message = await Message.create({
      chat:    chatId,
      sender:  req.userId,
      type,
      content,
      replyTo: replyTo || null,
      readBy:  [{ user: req.userId }],
    });

    await Chat.findByIdAndUpdate(chatId, { lastMessage: message._id });

    const populated = await message.populate([
      { path: 'sender',  select: 'username avatar' },
      { path: 'replyTo', select: 'content sender type' },
    ]);

    const otherMembers = chat.members
      .filter((m) => m.user.toString() !== req.userId)
      .map((m) => m.user.toString());

    await Promise.all(
      otherMembers.map((memberId) =>
        emitToUser(memberId, 'message:new', { message: populated })
      )
    );

    res.status(201).json({ success: true, message: populated });
  } catch (err) {
    next(err);
  }
};

//  GET /messages/:chatId 
export const getMessages = async (req, res, next) => {
  try {
    if (!handleValidation(req, res)) return;

    const { chatId }          = req.params;
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 30;
    const skip  = (page - 1) * limit;

    const chat = await Chat.findOne({
      _id:            chatId,
      'members.user': req.userId,
    }).select('_id');                              // ✅ minimal projection

    if (!chat) {
      return res.status(404).json({ success: false, message: 'Chat not found' });
    }

    const [messages, total] = await Promise.all([
      Message.find({ chat: chatId, isDeleted: false })
        .populate('sender',  'username avatar')
        .populate('replyTo', 'content sender type')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Message.countDocuments({ chat: chatId, isDeleted: false }),
    ]);

    res.json({
      success: true,
      messages: messages.reverse(),
      pagination: {
        page,
        limit,
        total,
        pages:   Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
    });
  } catch (err) {
    next(err);
  }
};

//  PUT /messages/:messageId/read 
export const markAsRead = async (req, res, next) => {
  try {
    if (!handleValidation(req, res)) return;

    const { messageId } = req.params;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ success: false, message: 'Message not found' });
    }

    const alreadyRead = message.readBy.some(
      (r) => r.user.toString() === req.userId
    );

    if (!alreadyRead) {
      message.readBy.push({ user: req.userId });

      // ✅ Fix 1 — O(1) length check instead of O(N×M) nested loop
      const chat = await Chat.findById(message.chat).select('members');
      const allRead = chat.members.length === message.readBy.length;
      if (allRead) message.status = 'read';

      await message.save();

      await emitToUser(message.sender.toString(), 'message:read', {
        messageId,
        readBy: req.userId,
      });
    }

    res.json({ success: true, message });
  } catch (err) {
    next(err);
  }
};

//  DELETE /messages/:messageId 
export const deleteMessage = async (req, res, next) => {
  try {
    if (!handleValidation(req, res)) return;

    const message = await Message.findOne({
      _id:    req.params.messageId,
      sender: req.userId,
    });

    if (!message) {
      return res.status(404).json({ success: false, message: 'Message not found' });
    }

    message.isDeleted = true;
    message.content   = '';
    await message.save();

    // projection, only fetch members field
    const chat = await Chat.findById(message.chat).select('members');
    const otherMembers = chat.members
      .filter((m) => m.user.toString() !== req.userId)
      .map((m) => m.user.toString());

    await Promise.all(
      otherMembers.map((memberId) =>
        emitToUser(memberId, 'message:deleted', { messageId: message._id })
      )
    );

    res.json({ success: true, message: 'Message deleted' });
  } catch (err) {
    next(err);
  }
};