const mongoose = require('mongoose');

const reelSchema = new mongoose.Schema({
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  video: { type: String, required: true },
  thumbnail: String,
  caption: String,
  audio: {
    name: String,
    url: String,
    artist: String
  },
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  comments: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    text: String,
    createdAt: { type: Date, default: Date.now }
  }],
  shares: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  views: { type: Number, default: 0 },
  hashtags: [String],
  effects: [String]
}, { timestamps: true });

module.exports = mongoose.model('Reel', reelSchema);