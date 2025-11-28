const mongoose = require('mongoose');
const watermarkPolicySchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  ownerType: { type: String, enum: ['user', 'page', 'group'], default: 'user' },
  enabled: { type: Boolean, default: false },
  watermarkType: { type: String, enum: ['text', 'logo', 'composite', 'dynamic'], default: 'text' },
  textContent: String,
  logoUrl: String,
  position: { type: String, enum: ['top-left', 'top-right', 'bottom-left', 'bottom-right', 'center'], default: 'bottom-right' },
  opacity: { type: Number, min: 0, max: 1, default: 0.7 },
  scale: { type: Number, min: 0.1, max: 2, default: 1 },
  color: { type: String, default: '#FFFFFF' },
  applyToTypes: [{ type: String, enum: ['image', 'video', 'all'] }],
  dynamicData: { includeUserId: Boolean, includeTimestamp: Boolean, includeHash: Boolean },
  isActive: { type: Boolean, default: true },
  metadata: mongoose.Schema.Types.Mixed
}, { timestamps: true });
watermarkPolicySchema.index({ owner: 1, ownerType: 1 });
module.exports = mongoose.model('WatermarkPolicy', watermarkPolicySchema);