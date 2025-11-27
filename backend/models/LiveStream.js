const mongoose = require('mongoose');

const liveStreamSchema = new mongoose.Schema({
  streamer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  description: String,
  thumbnail: String,
  streamKey: { type: String, required: true, unique: true },
  rtmpUrl: String,
  hlsUrl: String,
  status: { type: String, enum: ['scheduled', 'live', 'ended'], default: 'scheduled' },
  viewers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  maxViewers: { type: Number, default: 0 },
  totalViews: { type: Number, default: 0 },
  duration: { type: Number, default: 0 }, // in seconds
  scheduledAt: Date,
  startedAt: Date,
  endedAt: Date,
  category: String,
  tags: [String],
  isPrivate: { type: Boolean, default: false },
  allowedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  chat: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    message: String,
    timestamp: { type: Date, default: Date.now },
    isDeleted: { type: Boolean, default: false }
  }],
  reactions: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    type: { type: String, enum: ['like', 'love', 'wow', 'laugh', 'sad', 'angry'] },
    timestamp: { type: Date, default: Date.now }
  }],
  settings: {
    allowComments: { type: Boolean, default: true },
    allowReactions: { type: Boolean, default: true },
    moderators: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
  }
}, { timestamps: true });

liveStreamSchema.index({ streamer: 1, status: 1 });
liveStreamSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('LiveStream', liveStreamSchema);