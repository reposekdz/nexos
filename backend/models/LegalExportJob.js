const mongoose = require('mongoose');
const legalExportJobSchema = new mongoose.Schema({
  requestId: { type: String, required: true, unique: true },
  caseNumber: String,
  requestType: { type: String, enum: ['law_enforcement', 'court_order', 'subpoena', 'warrant', 'gdpr', 'other'], required: true },
  targetUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  requesterInfo: { organization: String, name: String, email: String, jurisdiction: String },
  dataTypes: [{ type: String, enum: ['profile', 'posts', 'messages', 'contacts', 'activity', 'transactions', 'all'] }],
  dateRange: { start: Date, end: Date },
  status: { type: String, enum: ['pending_approval', 'approved', 'processing', 'completed', 'rejected', 'failed'], default: 'pending_approval' },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedAt: Date,
  processedAt: Date,
  exportUrl: String,
  exportHash: String,
  expiresAt: Date,
  auditLog: [{ action: String, actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, timestamp: { type: Date, default: Date.now }, notes: String }],
  metadata: mongoose.Schema.Types.Mixed
}, { timestamps: true });
legalExportJobSchema.index({ requestId: 1 });
legalExportJobSchema.index({ targetUser: 1 });
module.exports = mongoose.model('LegalExportJob', legalExportJobSchema);