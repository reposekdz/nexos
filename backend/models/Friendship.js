const mongoose = require('mongoose');

const friendshipSchema = new mongoose.Schema({
  user1: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  user2: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  friendsSince: { type: Date, default: Date.now },
  closeFriend: { type: Boolean, default: false },
  favoritedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  interactionScore: { type: Number, default: 0 },
  lastInteraction: Date
}, { timestamps: true });

friendshipSchema.index({ user1: 1, user2: 1 }, { unique: true });

module.exports = mongoose.model('Friendship', friendshipSchema);