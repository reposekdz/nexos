const mongoose = require('mongoose');
const analyticsExportSchema = new mongoose.Schema({
  requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  exportType: { type: String, enum: ['events', 'users', 'metrics', 'cohorts', 'funnels', 'custom'], required: true },
  format: { type: String, enum: ['csv', 'json', 'xlsx', 'parquet'], default: 'csv' },
  dateRange: { start: { type: Date, required: true }, end: { type: Date, required: true } },
  filters: mongoose.Schema.Types.Mixed,
  columns: [String],
  status: { type: String, enum: ['queued', 'processing', 'completed', 'failed', 'expired'], default: 'queued' },
  progress: { type: Number, min: 0, max: 100, default: 0 },
  rowCount: Number,
  fileSize: Number,
  exportUrl: String,
  signedUrl: String,
  urlExpiresAt: Date,
  downloadedAt: Date,
  expiresAt: { type: Date, default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
  error: String,
  metadata: mongoose.Schema.Types.Mixed
}, { timestamps: true });
analyticsExportSchema.index({ requestedBy: 1, createdAt: -1 });
module.exports = mongoose.model('AnalyticsExport', analyticsExportSchema);