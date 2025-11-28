const mongoose = require('mongoose');
const clientVersionSchema = new mongoose.Schema({
  platform: { type: String, enum: ['web', 'mobile_ios', 'mobile_android', 'desktop_windows', 'desktop_mac', 'desktop_linux'], required: true },
  version: { type: String, required: true },
  buildNumber: Number,
  releaseDate: { type: Date, default: Date.now },
  minSupportedVersion: String,
  updatePolicy: { type: String, enum: ['none', 'optional', 'recommended', 'required'], default: 'optional' },
  enforcementDate: Date,
  features: [String],
  bugFixes: [String],
  downloadUrl: String,
  releaseNotes: String,
  isActive: { type: Boolean, default: true },
  deprecatedAt: Date,
  analytics: { totalInstalls: Number, activeInstalls: Number, crashRate: Number, adoptionRate: Number },
  metadata: mongoose.Schema.Types.Mixed
}, { timestamps: true });
clientVersionSchema.index({ platform: 1, version: 1 }, { unique: true });
module.exports = mongoose.model('ClientVersion', clientVersionSchema);