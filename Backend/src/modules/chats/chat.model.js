import mongoose from 'mongoose';

const chatSchema = new mongoose.Schema(
  {
    type: {
      type:     String,
      enum:     ['private', 'group'],
      required: true,
    },
    name: {
      type:      String,
      trim:      true,
      maxlength: 50,
    },
    avatar: {
      key: { type: String, default: '' },
      url: { type: String, default: '' },
    },
    description: {
      type:      String,
      default:   '',
      maxlength: 200,
    },
    members: [
      {
        user: {
          type:     mongoose.Schema.Types.ObjectId,
          ref:      'User',
          required: true,
        },
        role: {
          type:    String,
          enum:    ['member', 'admin'],
          default: 'member',
        },
        joinedAt: {
          type:    Date,
          default: Date.now,
        },
      },
    ],
    lastMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref:  'Message',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref:  'User',
    },
  },
  { timestamps: true }
);

// Performance index — speeds up "get my chats" query
// NOT a uniqueness constraint — duplicate prevention is in controller
chatSchema.index({ 'members.user': 1, updatedAt: -1 });

export default mongoose.model('Chat', chatSchema);