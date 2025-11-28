const mongoose = require('mongoose');

const embedCacheSchema = new mongoose.Schema({
  targetId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  targetType: {
    type: String,
    enum: ['post', 'reel', 'story'],
    required: true
  },
  html: {
    type: String,
    required: true
  },
  metadata: {
    title: String,
    description: String,
    imageUrl: String,
    author: String,
    authorAvatar: String,
    publishedAt: Date
  },
  isPublic: {
    type: Boolean,
    default: true
  },
  allowedOrigins: [String],
  embedViews: {
    type: Number,
    default: 0
  },
  lastFetched: {
    type: Date,
    default: Date.now
  },
  expiresAt: Date
}, {
  timestamps: true
});

embedCacheSchema.index({ targetId: 1, targetType: 1 }, { unique: true });
embedCacheSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
embedCacheSchema.index({ lastFetched: 1 });

module.exports = mongoose.model('EmbedCache', embedCacheSchema);
