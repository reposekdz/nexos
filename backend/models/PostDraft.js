const mongoose = require('mongoose');

const postDraftSchema = new mongoose.Schema({
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  content: { type: String, maxlength: 100000 },
  media: [{
    type: { type: String, enum: ['image', 'video', 'file'] },
    url: String,
    thumbnail: String,
    size: Number,
    fileName: String
  }],
  audience: {
    type: { type: String, enum: ['public', 'friends', 'friends_except', 'specific_friends', 'only_me'], default: 'public' },
    allowList: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    denyList: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
  },
  location: {
    name: String,
    coordinates: { type: [Number], index: '2dsphere' }
  },
  feeling: String,
  tags: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  pollData: Object,
  autoSavedAt: Date,
  expiresAt: { type: Date, default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) }
}, { timestamps: true });

postDraftSchema.index({ author: 1, createdAt: -1 });
postDraftSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('PostDraft', postDraftSchema);