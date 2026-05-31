import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema(
  {
    chat: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'Chat',
      required: true,
    },
    sender: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'User',
      required: true,
    },
    type: {
      type:    String,
      enum:    ['text', 'image', 'file', 'audio'],
      default: 'text',
    },
    content: {
      type:    String,
      default: '',
    },
    attachment: {
      key:      { type: String, default: '' },
      url:      { type: String, default: '' },
      filename: { type: String, default: '' },
      size:     { type: Number, default: 0  },
      mimeType: { type: String, default: '' },
    },
    readBy: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref:  'User',
        },
        readAt: {
          type:    Date,
          default: Date.now,
        },
      },
    ],
    status: {
      type:    String,
      enum:    ['sent', 'delivered', 'read'],
      default: 'sent',
    },
    replyTo: {
      type:    mongoose.Schema.Types.ObjectId,
      ref:     'Message',
      default: null,
    },
    isDeleted: {
      type:    Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Optimized — includes isDeleted so pagination query
// doesn't do in-memory scan after index fetch
messageSchema.index({ chat: 1, isDeleted: 1, createdAt: -1 });

export default mongoose.model('Message', messageSchema);