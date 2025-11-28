const mongoose = require('mongoose');

const mutedEntitySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  entityType: {
    type: String,
    enum: ['post', 'thread', 'user', 'group', 'hashtag'],
    required: true
  },
  entityId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  muteType: {
    type: String,
    enum: ['notifications', 'content', 'all'],
    default: 'notifications'
  },
  expiresAt: Date,
  reason: String
}, {
  timestamps: true
});

mutedEntitySchema.index({ user: 1, entityType: 1, entityId: 1 }, { unique: true });
mutedEntitySchema.index({ user: 1, entityType: 1 });
mutedEntitySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('MutedEntity', mutedEntitySchema);
