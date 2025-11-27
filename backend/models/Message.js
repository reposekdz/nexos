const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  group: { type: mongoose.Schema.Types.ObjectId, ref: 'Group' },
  content: String,
  media: {
    type: { type: String, enum: ['image', 'video', 'audio', 'file'] },
    url: String,
    filename: String
  },
  messageType: { type: String, enum: ['text', 'media', 'call'], default: 'text' },
  isRead: { type: Boolean, default: false },
  readAt: Date,
  isDelivered: { type: Boolean, default: false },
  deliveredAt: Date
}, { timestamps: true });

module.exports = mongoose.model('Message', messageSchema);