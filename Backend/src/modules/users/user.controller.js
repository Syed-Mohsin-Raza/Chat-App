import { validationResult } from "express-validator";
import bcrypt from "bcrypt";
import User from "./user.model.js";
import redis from "../../config/redis.js";
import { REDIS_TTL, BCRYPT_ROUNDS } from "../../constants/index.js";

// Get /users/me
export const getMe = async (req, res, next) => {
    try {
        const user = await User.findById(req.userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        res.json({ success: true, user});
    } catch (err) {
        next(err);
    }
};

// Get /users/:id
export const getUserById = async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(422).json({ success: false, errors: errors.array() });
        }

        const user = await User.findById(req.params.id).select('-password');
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const isOnline = await redis.get(`presence:${req.params.id}`);

        res.json({ success: true, user: { ...user.toObject(), isOnline: !!isOnline } });
    } catch (err) {
        next(err);
    }
};

// PUT /users/me
export const updateProfile = async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(422).json({ success: false, errors: errors.array() });
        }

        const { username, bio } = req.body;

        if (username) {
            const exists = await User.findOne({ username, _id: { $ne: req.userId } });
            if (exists) {
                return res.status(409).json({ success: false, message: 'Username already taken' });
            }
        }

        const updated = await User.findByIdAndUpdate(
            req.userId,
            { $set: { username, bio } },
            { returnDocument: 'after', runValidators: true }
        );

        res.json({ success: true, user: updated });
    } catch (err) {
        next(err);
    }
};

// PUT /users/me/password
export const changePassword = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ success: false, errors: errors.array() });
    }

    const { currentPassword, newPassword } = req.body;

    // 1. Fetch ONLY password field
    const user = await User.findById(req.userId).select('+password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // 2. Verify current password
    const match = await bcrypt.compare(currentPassword, user.password);
    if (!match) {
      return res.status(401).json({ success: false, message: 'Current password incorrect' });
    }

    // 3. Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

    // 4. Atomic update — only password field touched
    await User.findByIdAndUpdate(req.userId, {
      $set: { password: hashedNewPassword },
    });

    // 5. Invalidate session — force re-login
    await redis.del(`session:${req.userId}`);

    res.json({ success: true, message: 'Password changed. Please login again.' });
  } catch (err) {
    next(err);
  }
};

// GET /users/search?q=
export const searchUsers = async (req, res, next) => {
    try {
        const { q } = req.query;
        if (!q || q.trim().length < 2) {
            return res.status(400).json({ success: false, message: 'Search query is at least 2 characters long' });
        }

        const users = await User.find({
            $or: [
                { username: { $regex: q, $options: 'i' } },
                { email: { $regex: q, $options: 'i' } },
            ],
            _id: { $ne: req.userId }
        })
            .select('username email avatar bio')
            .limit(20);

        res.json({ success: true, users });
    } catch (err) {
        next(err);
    }
};

// DELETE /users/me
export const deleteAccount = async (req, res, next) => {
    try {
        await User.findByIdAndDelete(req.userId);

        await redis.del(`session:${req.userId}`);
        await redis.del(`presence:${req.userId}`);

        res.json({ success: true, message: 'Account deleted successfully' });
    } catch (err) {
        next(err);
    }
};

