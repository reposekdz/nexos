const mongoose = require('mongoose');
const verificationRequestSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  entityType: { type: String, enum: ['user', 'page', 'organization'], default: 'user' },
  verificationType: { type: String, enum: ['identity', 'notable', 'business', 'government', 'custom'], required: true },
  submittedData: { fullName: String, organizationName: String, category: String, website: String, socialLinks: [String], phoneNumber: String },
  documents: [{ type: { type: String, enum: ['id', 'passport', 'business_license', 'utility_bill', 'other'] }, url: String, encryptedUrl: String, uploadedAt: Date, verified: Boolean }],
  automatedChecks: { emailVerified: Boolean, phoneVerified: Boolean, socialPresence: Number, accountAge: Number, riskScore: Number },
  status: { type: String, enum: ['pending', 'under_review', 'additional_info_required', 'approved', 'rejected', 'expired'], default: 'pending' },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewedAt: Date,
  verifiedAt: Date,
  verificationBadge: { type: String, enum: ['blue', 'gold', 'government', 'business'] },
  expiresAt: Date,
  metadata: mongoose.Schema.Types.Mixed
}, { timestamps: true });
verificationRequestSchema.index({ user: 1, status: 1 });
module.exports = mongoose.model('VerificationRequest', verificationRequestSchema);