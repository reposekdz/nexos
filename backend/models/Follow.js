const mongoose = require('mongoose');

const followSchema = new mongoose.Schema({
  follower: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  following: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  notificationsEnabled: { type: Boolean, default: true },
  isCloseFriend: { type: Boolean, default: false }
}, { timestamps: true });

followSchema.index({ follower: 1, following: 1 }, { unique: true });
followSchema.index({ following: 1, createdAt: -1 });

module.exports = mongoose.model('Follow', followSchema);