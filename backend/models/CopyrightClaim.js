const mongoose = require('mongoose');
const copyrightClaimSchema = new mongoose.Schema({
  claimId: { type: String, required: true, unique: true },
  claimant: { name: String, email: String, organization: String, address: String },
  targetContent: { contentType: { type: String, enum: ['post', 'comment', 'media', 'profile'], required: true }, contentId: { type: mongoose.Schema.Types.ObjectId, required: true }, url: String },
  contentOwner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  workDescription: { type: String, required: true },
  originalWorkUrl: String,
  infringementDescription: { type: String, required: true },
  evidence: [{ type: String, url: String, uploadedAt: Date }],
  status: { type: String, enum: ['submitted', 'reviewing', 'valid', 'invalid', 'counter_claimed', 'resolved', 'withdrawn'], default: 'submitted' },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewedAt: Date,
  actionTaken: { type: String, enum: ['none', 'content_disabled', 'content_removed', 'account_warned', 'account_suspended'] },
  actionDate: Date,
  counterClaim: { filed: Boolean, filedAt: Date, reason: String, evidence: [String], status: String },
  timeline: [{ event: String, actor: String, timestamp: { type: Date, default: Date.now }, details: String }],
  metadata: mongoose.Schema.Types.Mixed
}, { timestamps: true });
copyrightClaimSchema.index({ claimId: 1 });
copyrightClaimSchema.index({ contentOwner: 1, status: 1 });
module.exports = mongoose.model('CopyrightClaim', copyrightClaimSchema);