const mongoose = require('mongoose');
const crashReportSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  sessionId: String,
  crashId: { type: String, required: true, unique: true },
  platform: { type: String, enum: ['web', 'mobile_ios', 'mobile_android', 'desktop_windows', 'desktop_mac', 'desktop_linux'], required: true },
  appVersion: { type: String, required: true, index: true },
  osVersion: String,
  deviceModel: String,
  errorMessage: String,
  errorType: String,
  stackTrace: String,
  symbolicated: { type: Boolean, default: false },
  breadcrumbs: [mongoose.Schema.Types.Mixed],
  occurrenceCount: { type: Number, default: 1 },
  firstOccurrence: { type: Date, default: Date.now },
  lastOccurrence: { type: Date, default: Date.now },
  signature: { type: String, index: true },
  groupId: String,
  status: { type: String, enum: ['new', 'investigating', 'fixed', 'ignored'], default: 'new' },
  priority: { type: String, enum: ['low', 'medium', 'high', 'critical'] },
  tags: [String]
}, { timestamps: true });
crashReportSchema.index({ signature: 1, appVersion: 1 });
module.exports = mongoose.model('CrashReport', crashReportSchema);