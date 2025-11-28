const mongoose = require('mongoose');

const topicFollowerSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  topic: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Topic',
    required: true
  },
  notificationPreferences: {
    newPosts: { type: Boolean, default: true },
    trending: { type: Boolean, default: true },
    digest: {
      enabled: { type: Boolean, default: false },
      frequency: {
        type: String,
        enum: ['daily', 'weekly'],
        default: 'weekly'
      }
    }
  }
}, {
  timestamps: true
});

topicFollowerSchema.index({ user: 1, topic: 1 }, { unique: true });
topicFollowerSchema.index({ topic: 1, createdAt: -1 });

module.exports = mongoose.model('TopicFollower', topicFollowerSchema);
