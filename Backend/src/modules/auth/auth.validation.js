import { body } from "express-validator";

export const validateRegister = [
  body("username")
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage("Username must be between 3-30 characters"),

  body("email")
    .isEmail()
    .withMessage("Invalid email address"),

  body("password")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters long")
    .matches(/[A-Z]/).withMessage("Password must contain uppercase letter")
    .matches(/[0-9]/).withMessage("Password must contain a number")
];

export const validateLogin = [
  body("email").isEmail().withMessage("Invalid email address"),
  body("password").notEmpty().withMessage("Password is required"),
];