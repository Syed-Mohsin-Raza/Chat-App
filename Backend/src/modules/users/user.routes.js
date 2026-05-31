import { Router } from "express";
import {
    getMe,
    getUserById,
    updateProfile,
    changePassword,
    searchUsers,
    deleteAccount,
    updateAvatar,
} from "./user.controller.js";
import { protect } from "../../middleware/auth.middleware.js";
import {
    validateUpdateProfile,
    validateChangePassword,
    validateUserId,
} from "./user.validation.js";
import { handleUploadError, uploadAvatar } from "../../middleware/upload.middleware.js";

const router = Router();

router.use(protect); // All routes below require authentication


router.get("/me", getMe);
router.get("/search", searchUsers);
router.get("/:id", validateUserId, getUserById);
router.put("/me", validateUpdateProfile, updateProfile);
router.put("/me/password", validateChangePassword, changePassword);
router.delete("/me", deleteAccount);

router.post("/me/avatar", uploadAvatar, handleUploadError, updateAvatar);

export default router;
