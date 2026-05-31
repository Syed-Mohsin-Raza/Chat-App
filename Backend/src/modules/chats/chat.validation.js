import { body, param } from 'express-validator';

export const validateCreatePrivateChat = [
  body('userId')
    .notEmpty()
    .isMongoId()
    .withMessage('Valid userId required'),
];

export const validateCreateGroupChat = [
  body('name')
    .trim()
    .notEmpty()
    .isLength({ min: 2, max: 50 })
    .withMessage('Group name 2–50 characters required'),

  body('members')
    .isArray({ min: 2 })
    .withMessage('At least 2 members required'),

  body('members.*')
    .isMongoId()
    .withMessage('Each member must be a valid userId'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Description max 200 characters'),
];

export const validateUpdateGroup = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name 2–50 characters'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Description max 200 characters'),
];

export const validateChatId = [
  param('chatId')
    .isMongoId()
    .withMessage('Invalid chat ID'),
];

export const validateMemberId = [
  param('chatId').isMongoId().withMessage('Invalid chat ID'),
  param('memberId').isMongoId().withMessage('Invalid member ID'),
];