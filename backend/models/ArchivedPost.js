const mongoose = require('mongoose');
const archivedPostSchema = new mongoose.Schema({
  originalPostId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  post: { type: mongoose.Schema.Types.ObjectId, ref: 'Post' },
  archivedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  reason: { type: String, enum: ['policy_violation', 'age_limit', 'compliance', 'user_request', 'legal', 'retention_policy'], required: true },
  archiveDate: { type: Date, default: Date.now },
  originalContent: mongoose.Schema.Types.Mixed,
  archiveLocation: String,
  storageClass: { type: String, default: 'cold' },
  contentHash: String,
  retentionUntil: Date,
  canRestore: { type: Boolean, default: true },
  restoredAt: Date,
  accessLog: [{ accessor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, accessedAt: { type: Date, default: Date.now }, reason: String }],
  metadata: mongoose.Schema.Types.Mixed
}, { timestamps: true });
archivedPostSchema.index({ originalPostId: 1 });
archivedPostSchema.index({ retentionUntil: 1 });
module.exports = mongoose.model('ArchivedPost', archivedPostSchema);