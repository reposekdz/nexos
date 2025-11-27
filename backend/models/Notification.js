const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  type: { 
    type: String, 
    enum: ['like', 'comment', 'follow', 'message', 'group_invite', 'marketplace', 'story_view', 'reel_like', 'call', 'live_stream'],
    required: true 
  },
  title: { type: String, required: true },
  message: { type: String, required: true },
  data: {
    postId: { type: mongoose.Schema.Types.ObjectId, ref: 'Post' },
    groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'Group' },
    itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'MarketplaceItem' },
    storyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Story' },
    reelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Reel' },
    callId: String,
    url: String
  },
  isRead: { type: Boolean, default: false },
  readAt: Date,
  priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' }
}, { timestamps: true });

notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ isRead: 1 });

module.exports = mongoose.model('Notification', notificationSchema);