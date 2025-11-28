const mongoose = require('mongoose');
const emailUnsubscribeSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  email: { type: String, required: true, lowercase: true },
  categories: [{ type: String, enum: ['marketing', 'promotional', 'newsletter', 'digest', 'social', 'transactional_optional'] }],
  unsubscribeAll: { type: Boolean, default: false },
  token: { type: String, unique: true, sparse: true },
  tokenExpiry: Date,
  source: { type: String, enum: ['link', 'preference_center', 'support', 'admin'] },
  ipAddress: String,
  userAgent: String,
  canResubscribe: { type: Boolean, default: true },
  resubscribedAt: Date,
  metadata: mongoose.Schema.Types.Mixed
}, { timestamps: true });
emailUnsubscribeSchema.index({ user: 1, unsubscribeAll: 1 });
module.exports = mongoose.model('EmailUnsubscribe', emailUnsubscribeSchema);