import { validationResult } from 'express-validator';
import bcrypt from 'bcrypt';
import User from './user.model.js';
import redis from '../../config/redis.js';
import { uploadToS3, deleteFromS3, getPresignedUrl } from '../../utils/s3.utils.js';
import { BCRYPT_ROUNDS } from '../../constants/index.js';

//Helper: attach presigned URL to user object
const attachAvatarUrl = async (user) => {
  const obj = user.toObject ? user.toObject() : { ...user };
  obj.avatar = {
    key: obj.avatar?.key || '',
    url: obj.avatar?.key ? await getPresignedUrl(obj.avatar.key) : '',
  };
  return obj;
};

// GET /users/me
export const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const userWithUrl = await attachAvatarUrl(user);
    res.json({ success: true, user: userWithUrl });
  } catch (err) {
    next(err);
  }
};

// GET /users/:id
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

    // Presigned URL for public profile view
    const userWithUrl = await attachAvatarUrl(user);

    // Online status from Redis
    const isOnline = await redis.get(`presence:${req.params.id}`);

    res.json({
      success: true,
      user: { ...userWithUrl, isOnline: !!isOnline },
    });
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
      const exists = await User.findOne({
        username,
        _id: { $ne: req.userId },
      });
      if (exists) {
        return res.status(409).json({ success: false, message: 'Username already taken' });
      }
    }

    const updated = await User.findByIdAndUpdate(
      req.userId,
      { $set: { username, bio } },
      { returnDocument: 'after', runValidators: true }
    );

    const userWithUrl = await attachAvatarUrl(updated);
    res.json({ success: true, user: userWithUrl });
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

    const user = await User.findById(req.userId).select('+password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const match = await bcrypt.compare(currentPassword, user.password);
    if (!match) {
      return res.status(401).json({ success: false, message: 'Current password incorrect' });
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

    await User.findByIdAndUpdate(req.userId, {
      $set: { password: hashedNewPassword },
    });

    await redis.del(`session:${req.userId}`);

    res.json({ success: true, message: 'Password changed. Please login again.' });
  } catch (err) {
    next(err);
  }
};

// GET /users/search 
export const searchUsers = async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 2) {
      return res.status(400).json({ success: false, message: 'Query min 2 characters' });
    }

    const users = await User.find({
      $or: [
        { username: { $regex: q, $options: 'i' } },
        { email:    { $regex: q, $options: 'i' } },
      ],
      _id: { $ne: req.userId },
    })
      .select('username email avatar bio')
      .limit(20);

    // Presigned URLs for all search results
    const usersWithUrls = await Promise.all(
      users.map((u) => attachAvatarUrl(u))
    );

    res.json({ success: true, users: usersWithUrls });
  } catch (err) {
    next(err);
  }
};

// POST /users/me/avatar
export const updateAvatar = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file provided' });
    }

    // 1. Upload new file to S3 first
    const { key } = await uploadToS3(req.file, 'avatars');

    // 2. Single atomic DB update — returns OLD doc
    const oldUser = await User.findByIdAndUpdate(
      req.userId,
      { $set: { 'avatar.key': key } },
      { new: false }
    ).select('avatar');              // chained correctly

    // 3. Delete old file from S3 (non-blocking)
    if (oldUser?.avatar?.key) {
      deleteFromS3(oldUser.avatar.key); // ← no await — fire and forget
    }

    // 4. Return fresh presigned URL
    const url = await getPresignedUrl(key);
    res.json({ success: true, avatar: { key, url } });
  } catch (err) {
    next(err);
  }
};

// DELETE /users/me
export const deleteAccount = async (req, res, next) => {
  try {
    const user = await User.findByIdAndDelete(req.userId);

    // Delete avatar from S3 if exists
    if (user?.avatar?.key) {
      await deleteFromS3(user.avatar.key);
    }

    await redis.del(`session:${req.userId}`);
    await redis.del(`presence:${req.userId}`);

    res.json({ success: true, message: 'Account deleted' });
  } catch (err) {
    next(err);
  }
};