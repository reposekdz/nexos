const mongoose = require('mongoose');

const assetLibrarySchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, enum: ['image', 'video', 'audio', 'document'], required: true },
  url: { type: String, required: true },
  thumbnail: String,
  size: Number,
  mimeType: String,
  dimensions: { width: Number, height: Number },
  duration: Number,
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  team: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
  tags: [String],
  metadata: mongoose.Schema.Types.Mixed,
  license: {
    type: String,
    holder: String,
    expiresAt: Date,
    restrictions: [String]
  },
  acl: [{
    type: { type: String, enum: ['user', 'team', 'public'] },
    id: mongoose.Schema.Types.ObjectId,
    permissions: [String]
  }],
  usage: {
    views: { type: Number, default: 0 },
    downloads: { type: Number, default: 0 },
    lastUsed: Date
  },
  status: { type: String, enum: ['active', 'archived', 'expired'], default: 'active' }
}, { timestamps: true });

assetLibrarySchema.index({ owner: 1, status: 1 });
assetLibrarySchema.index({ team: 1, status: 1 });
assetLibrarySchema.index({ tags: 1 });

module.exports = mongoose.model('AssetLibrary', assetLibrarySchema);
