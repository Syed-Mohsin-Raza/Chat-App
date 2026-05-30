import { body, param } from "express-validator";

export const validateUpdateProfile = [
  body("username")
    .optional()
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage("Username must be between 3-30 characters"),
  body("bio")
    .optional()
    .trim()
    .isLength({ max: 160 })
    .withMessage("Bio must be less than 160 characters"),
];

export const validateChangePassword = [
  body("currentPassword")
    .notEmpty()
    .withMessage("Current password is required"),
  body("newPassword")
    .isLength({ min: 8 })
    .withMessage("New password must be at least 8 characters")
    .matches(/[A-Z]/).withMessage("Must contain at least one uppercase letter")
    .matches(/[0-9]/).withMessage("Must contain at least one number"),
];

export const validateUserId = [
  param("id")
    .isMongoId()
    .withMessage("Invalid user ID format"),
];