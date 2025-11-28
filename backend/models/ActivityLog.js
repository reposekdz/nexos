const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  action: {
    type: String,
    required: true,
    enum: [
      'login', 'logout', 'login_failed',
      'post_created', 'post_updated', 'post_deleted',
      'comment_created', 'comment_deleted',
      'profile_updated', 'password_changed', 'email_changed',
      'privacy_settings_changed', 'account_deleted',
      'content_reported', 'appeal_submitted',
      'data_exported', 'consent_updated',
      'follow', 'unfollow', 'block', 'unblock',
      'message_sent', 'group_joined', 'group_left',
      'ad_clicked', 'purchase_made'
    ]
  },
  targetType: {
    type: String,
    enum: ['user', 'post', 'comment', 'message', 'group', 'ad', 'page']
  },
  targetId: mongoose.Schema.Types.ObjectId,
  metadata: {
    type: Object
  },
  ipAddress: String,
  userAgent: String,
  deviceType: {
    type: String,
    enum: ['web', 'mobile', 'desktop', 'tablet']
  },
  location: {
    country: String,
    city: String,
    coordinates: {
      lat: Number,
      lng: Number
    }
  },
  sessionId: String,
  success: {
    type: Boolean,
    default: true
  },
  errorMessage: String
}, {
  timestamps: true
});

activityLogSchema.index({ user: 1, createdAt: -1 });
activityLogSchema.index({ action: 1, createdAt: -1 });
activityLogSchema.index({ sessionId: 1 });
activityLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model('ActivityLog', activityLogSchema);
