const mongoose = require('mongoose');

const savedFeedFilterSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  isDefault: {
    type: Boolean,
    default: false
  },
  criteria: {
    contentTypes: [{
      type: String,
      enum: ['post', 'reel', 'story', 'ad']
    }],
    mediaTypes: [{
      type: String,
      enum: ['text', 'image', 'video', 'link']
    }],
    sources: [{
      type: String,
      enum: ['friends', 'following', 'groups', 'pages', 'suggested']
    }],
    timeRange: {
      type: String,
      enum: ['today', 'week', 'month', 'all']
    },
    sortBy: {
      type: String,
      enum: ['chronological', 'relevance', 'popularity'],
      default: 'relevance'
    },
    excludeUsers: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    includeHashtags: [String],
    excludeHashtags: [String],
    minLikes: Number,
    minComments: Number,
    verifiedOnly: Boolean
  },
  schedule: {
    enabled: { type: Boolean, default: false },
    timeRanges: [{
      dayOfWeek: { type: Number, min: 0, max: 6 },
      startHour: { type: Number, min: 0, max: 23 },
      endHour: { type: Number, min: 0, max: 23 }
    }]
  },
  usageCount: {
    type: Number,
    default: 0
  },
  lastUsed: Date
}, {
  timestamps: true
});

savedFeedFilterSchema.index({ user: 1, name: 1 }, { unique: true });
savedFeedFilterSchema.index({ user: 1, isDefault: 1 });

module.exports = mongoose.model('SavedFeedFilter', savedFeedFilterSchema);
