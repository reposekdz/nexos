const mongoose = require('mongoose');
const identityDocumentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  verificationRequest: { type: mongoose.Schema.Types.ObjectId, ref: 'VerificationRequest' },
  documentType: { type: String, enum: ['passport', 'drivers_license', 'national_id', 'residence_permit', 'utility_bill', 'business_license'], required: true },
  documentNumber: String,
  issuingCountry: String,
  issueDate: Date,
  expiryDate: Date,
  encryptedFrontUrl: String,
  encryptedBackUrl: String,
  kmsKeyId: String,
  extractedData: mongoose.Schema.Types.Mixed,
  verificationStatus: { type: String, enum: ['pending', 'processing', 'verified', 'failed', 'expired'], default: 'pending' },
  verificationProvider: String,
  verificationScore: Number,
  fraudChecks: { tampering: Boolean, photocopy: Boolean, expiry: Boolean, blacklist: Boolean, score: Number },
  accessLog: [{ accessor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, accessedAt: { type: Date, default: Date.now }, reason: String }],
  retentionUntil: Date,
  metadata: mongoose.Schema.Types.Mixed
}, { timestamps: true });
identityDocumentSchema.index({ user: 1, verificationStatus: 1 });
module.exports = mongoose.model('IdentityDocument', identityDocumentSchema);