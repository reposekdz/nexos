const mongoose = require('mongoose');

const dataExportJobSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  exportType: {
    type: String,
    enum: ['gdpr_full', 'portability', 'activity_log', 'personal_data'],
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'expired'],
    default: 'pending'
  },
  format: {
    type: String,
    enum: ['json', 'csv', 'zip'],
    default: 'zip'
  },
  includeData: {
    profile: { type: Boolean, default: true },
    posts: { type: Boolean, default: true },
    comments: { type: Boolean, default: true },
    messages: { type: Boolean, default: true },
    media: { type: Boolean, default: true },
    connections: { type: Boolean, default: true },
    activity: { type: Boolean, default: true },
    settings: { type: Boolean, default: true }
  },
  dateRange: {
    from: Date,
    to: Date
  },
  fileUrl: String,
  fileSize: Number,
  filePath: String,
  downloadToken: String,
  expiresAt: Date,
  downloadCount: {
    type: Number,
    default: 0
  },
  maxDownloads: {
    type: Number,
    default: 5
  },
  processingStartedAt: Date,
  completedAt: Date,
  error: String,
  manifest: {
    files: [String],
    checksums: Object
  },
  encrypted: {
    type: Boolean,
    default: true
  },
  notificationSent: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

dataExportJobSchema.index({ user: 1, createdAt: -1 });
dataExportJobSchema.index({ status: 1, createdAt: -1 });
dataExportJobSchema.index({ downloadToken: 1 });
dataExportJobSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('DataExportJob', dataExportJobSchema);
