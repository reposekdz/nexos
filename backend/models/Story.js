const mongoose = require('mongoose');

const storySchema = new mongoose.Schema({
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  media: {
    type: { type: String, enum: ['image', 'video'] },
    url: String,
    thumbnail: String
  },
  text: String,
  textColor: { type: String, default: '#ffffff' },
  textAlignment: { type: String, enum: ['left', 'center', 'right'], default: 'center' },
  fontSize: { type: Number, default: 32 },
  backgroundColor: String,
  filter: { type: String, default: 'none' },
  stickers: [{
    emoji: String,
    x: Number,
    y: Number,
    scale: Number,
    rotation: Number
  }],
  music: {
    id: String,
    name: String,
    artist: String,
    duration: String
  },
  interactive: {
    type: { type: String, enum: ['poll', 'question', 'quiz', 'slider', 'countdown', 'link'] },
    data: mongoose.Schema.Types.Mixed,
    responses: [{
      user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      response: mongoose.Schema.Types.Mixed,
      timestamp: { type: Date, default: Date.now }
    }]
  },
  views: [{ 
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    timestamp: { type: Date, default: Date.now }
  }],
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  replies: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    message: String,
    timestamp: { type: Date, default: Date.now }
  }],
  shares: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  duration: { type: Number, default: 5 },
  privacy: { type: String, enum: ['public', 'friends', 'close_friends', 'custom'], default: 'public' },
  allowReplies: { type: Boolean, default: true },
  allowSharing: { type: Boolean, default: true },
  archived: { type: Boolean, default: false },
  highlight: {
    id: { type: mongoose.Schema.Types.ObjectId, ref: 'StoryHighlight' },
    addedAt: Date
  },
  expiresAt: { type: Date, default: () => new Date(Date.now() + 24 * 60 * 60 * 1000) }
}, { timestamps: true });

storySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
storySchema.index({ author: 1, createdAt: -1 });
storySchema.index({ 'views.user': 1 });

const StoryHighlightSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  coverImage: String,
  stories: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Story' }],
  order: { type: Number, default: 0 }
}, { timestamps: true });

const Story = mongoose.model('Story', storySchema);
const StoryHighlight = mongoose.model('StoryHighlight', StoryHighlightSchema);

module.exports = { Story, StoryHighlight };