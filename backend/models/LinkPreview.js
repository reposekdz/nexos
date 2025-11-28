const mongoose = require('mongoose');

const linkPreviewSchema = new mongoose.Schema({
  url: { type: String, required: true, unique: true },
  canonicalUrl: String,
  title: String,
  description: String,
  images: [String],
  siteName: String,
  favicon: String,
  type: String,
  video: {
    url: String,
    width: Number,
    height: Number
  },
  lastFetched: { type: Date, default: Date.now },
  fetchCount: { type: Number, default: 1 },
  expiresAt: { type: Date, default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) }
}, { timestamps: true });

linkPreviewSchema.index({ url: 1 });
linkPreviewSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('LinkPreview', linkPreviewSchema);