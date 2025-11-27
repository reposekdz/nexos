const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, required: true },
  media: [{
    type: { type: String, enum: ['image', 'video'] },
    url: String,
    thumbnail: String
  }],
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  comments: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    text: String,
    createdAt: { type: Date, default: Date.now },
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    votes: {
      up: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
      down: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
    },
    replies: [{
      user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      text: String,
      createdAt: { type: Date, default: Date.now }
    }],
    isPinned: { type: Boolean, default: false },
    isHighlighted: { type: Boolean, default: false }
  }],
  reactions: [{
    type: { type: String, enum: ['like', 'love', 'wow', 'haha', 'sad', 'angry'] },
    users: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
  }],
  shares: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  tags: [String],
  location: String,
  visibility: { type: String, enum: ['public', 'friends', 'private'], default: 'public' },
  locationVisibility: {
    enabled: { type: Boolean, default: false },
    radius: Number
  },
  isPinned: { type: Boolean, default: false },
  isArchived: { type: Boolean, default: false },
  scheduledFor: Date,
  editHistory: [{
    content: String,
    editedAt: Date
  }]
}, { timestamps: true });

module.exports = mongoose.model('Post', postSchema);