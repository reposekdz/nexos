const mongoose = require('mongoose');

const dynamicLayoutSchema = new mongoose.Schema({
  name: { type: String, required: true },
  key: { type: String, required: true, unique: true, index: true },
  version: { type: Number, default: 1 },
  status: { type: String, enum: ['draft', 'published', 'archived'], default: 'draft' },
  platform: { type: String, enum: ['web', 'mobile_ios', 'mobile_android', 'desktop', 'all'], default: 'all' },
  blocks: [{
    type: { type: String, required: true },
    id: String,
    props: mongoose.Schema.Types.Mixed,
    children: mongoose.Schema.Types.Mixed,
    order: Number
  }],
  targeting: {
    segments: [String],
    rules: mongoose.Schema.Types.Mixed,
    personalization: mongoose.Schema.Types.Mixed
  },
  metadata: {
    thumbnail: String,
    description: String,
    tags: [String]
  },
  publishedAt: Date,
  publishedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  cdnUrl: String
}, { timestamps: true });

dynamicLayoutSchema.index({ key: 1, version: -1 });
dynamicLayoutSchema.index({ status: 1, platform: 1 });

module.exports = mongoose.model('DynamicLayout', dynamicLayoutSchema);
