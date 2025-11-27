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
  }],
  shoppableProducts: [{
    productId: String,
    position: { x: Number, y: Number },
    price: Number
  }],
  formatting: {
    bold: [{ start: Number, end: Number }],
    italic: [{ start: Number, end: Number }],
    links: [{ start: Number, end: Number, url: String }]
  },
  poll: {
    question: String,
    options: [{ text: String, votes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }] }],
    expiresAt: Date
  },
  music: {
    id: String,
    title: String,
    artist: String,
    url: String
  },
  taggedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  flags: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reason: String,
    createdAt: Date
  }],
  status: { type: String, enum: ['draft', 'published', 'scheduled', 'flagged'], default: 'published' }
}, { timestamps: true });

module.exports = mongoose.model('Post', postSchema);