const mongoose = require('mongoose');

const topicSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  slug: {
    type: String,
    required: true,
    unique: true
  },
  description: String,
  category: {
    type: String,
    enum: ['technology', 'sports', 'entertainment', 'news', 'business', 'lifestyle', 'education', 'health', 'gaming', 'other'],
    default: 'other'
  },
  coverImage: String,
  icon: String,
  followerCount: {
    type: Number,
    default: 0
  },
  postCount: {
    type: Number,
    default: 0
  },
  isOfficial: {
    type: Boolean,
    default: false
  },
  isTrending: {
    type: Boolean,
    default: false
  },
  trendingScore: {
    type: Number,
    default: 0
  },
  relatedTopics: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Topic'
  }],
  moderators: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  rules: [String],
  metadata: {
    hashtags: [String],
    keywords: [String]
  }
}, {
  timestamps: true
});

topicSchema.index({ name: 1 });
topicSchema.index({ slug: 1 });
topicSchema.index({ isTrending: 1, trendingScore: -1 });
topicSchema.index({ category: 1, followerCount: -1 });

module.exports = mongoose.model('Topic', topicSchema);
