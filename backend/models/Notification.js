const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  type: { 
    type: String, 
    enum: [
      'like', 'comment', 'follow', 'message', 'group_invite', 'marketplace', 
      'story_view', 'reel_like', 'call', 'live_stream', 'mention', 'share',
      'appeal_update', 'takedown_notice', 'system', 'security_alert'
    ],
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
  priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
  channels: {
    inApp: { type: Boolean, default: true },
    push: { type: Boolean, default: true },
    email: { type: Boolean, default: false },
    sms: { type: Boolean, default: false }
  },
  deliveryStatus: {
    inApp: { type: String, enum: ['pending', 'delivered', 'failed'], default: 'delivered' },
    push: { type: String, enum: ['pending', 'sent', 'delivered', 'failed'], default: 'pending' },
    email: { type: String, enum: ['pending', 'sent', 'delivered', 'failed'], default: 'pending' },
    sms: { type: String, enum: ['pending', 'sent', 'delivered', 'failed'], default: 'pending' }
  },
  batchId: String,
  groupedWith: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Notification' }],
  isGrouped: { type: Boolean, default: false },
  groupCount: { type: Number, default: 1 },
  expiresAt: Date
}, { timestamps: true });

notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, isRead: 1 });
notificationSchema.index({ batchId: 1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Notification', notificationSchema);