const mongoose = require('mongoose');
const dmcaTakedownSchema = new mongoose.Schema({
  takedownId: { type: String, required: true, unique: true },
  copyrightClaim: { type: mongoose.Schema.Types.ObjectId, ref: 'CopyrightClaim' },
  complainant: { name: { type: String, required: true }, email: { type: String, required: true }, address: String, organization: String },
  affectedUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  targetContent: [{ contentType: String, contentId: mongoose.Schema.Types.ObjectId, url: String, description: String }],
  legalBasis: { type: String, required: true },
  swornStatement: { type: Boolean, default: false },
  signature: String,
  status: { type: String, enum: ['received', 'validated', 'processing', 'executed', 'counter_notice', 'restored', 'closed'], default: 'received' },
  notifiedUser: { type: Boolean, default: false },
  notifiedAt: Date,
  contentDisabledAt: Date,
  counterNotice: { filed: Boolean, filedAt: Date, userStatement: String, consentToJurisdiction: Boolean },
  restorationEligible: { type: Boolean, default: false },
  restoredAt: Date,
  correspondence: [{ direction: { type: String, enum: ['inbound', 'outbound'] }, recipient: String, subject: String, sentAt: Date, body: String }],
  metadata: mongoose.Schema.Types.Mixed
}, { timestamps: true });
dmcaTakedownSchema.index({ takedownId: 1 });
dmcaTakedownSchema.index({ affectedUser: 1, status: 1 });
module.exports = mongoose.model('DMCATakedown', dmcaTakedownSchema);