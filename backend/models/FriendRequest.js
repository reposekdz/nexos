const mongoose = require('mongoose');

const friendRequestSchema = new mongoose.Schema({
  from: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  to: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'declined', 'expired', 'canceled'],
    default: 'pending'
  },
  message: { type: String, maxlength: 500 },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  },
  respondedAt: Date,
  responseMessage: String
}, { timestamps: true });

friendRequestSchema.index({ from: 1, to: 1 });
friendRequestSchema.index({ to: 1, status: 1 });
friendRequestSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('FriendRequest', friendRequestSchema);