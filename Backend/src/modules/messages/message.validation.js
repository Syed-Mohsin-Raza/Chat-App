import { body, param, query } from 'express-validator';

export const validateSendMessage = [
  body('chatId')
    .notEmpty()
    .isMongoId()
    .withMessage('Valid chatId required'),

  body('content')
    .if(body('type').equals('text'))
    .notEmpty()
    .withMessage('Content required for text messages'),

  body('type')
    .optional()
    .isIn(['text', 'image', 'file', 'audio'])
    .withMessage('Invalid message type'),

  body('replyTo')
    .optional()
    .isMongoId()
    .withMessage('Invalid replyTo message ID'),
];

export const validateGetMessages = [
  param('chatId')
    .isMongoId()
    .withMessage('Invalid chat ID'),

  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be positive integer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be 1–100'),
];

export const validateMessageId = [
  param('messageId')
    .isMongoId()
    .withMessage('Invalid message ID'),
]; 