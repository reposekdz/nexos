const mongoose = require('mongoose');

const takedownRequestSchema = new mongoose.Schema({
  requester: {
    name: { type: String, required: true },
    email: { type: String, required: true },
    organization: String,
    contactInfo: String
  },
  requestType: {
    type: String,
    enum: ['dmca', 'copyright', 'trademark', 'privacy', 'legal_order'],
    required: true
  },
  targetContent: {
    contentId: { type: mongoose.Schema.Types.ObjectId, required: true },
    contentType: { type: String, enum: ['post', 'reel', 'story', 'comment', 'profile'], required: true },
    contentUrl: String,
    description: String
  },
  copyrightInfo: {
    workDescription: String,
    originalWorkUrl: String,
    registrationNumber: String
  },
  reason: {
    type: String,
    required: true,
    maxlength: 5000
  },
  evidenceUrls: [String],
  legalDocuments: [String],
  status: {
    type: String,
    enum: ['submitted', 'under_review', 'provisional_takedown', 'approved', 'rejected', 'counter_notice_received'],
    default: 'submitted'
  },
  contentOwner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  notificationSent: {
    type: Boolean,
    default: false
  },
  notificationSentAt: Date,
  provisionalTakedownAt: Date,
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reviewNotes: String,
  reviewedAt: Date,
  counterNotice: {
    submitted: { type: Boolean, default: false },
    reason: String,
    evidenceUrls: [String],
    submittedAt: Date
  },
  chainOfCustody: [{
    action: String,
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    timestamp: { type: Date, default: Date.now },
    notes: String
  }],
  legalHold: {
    type: Boolean,
    default: false
  },
  restoredAt: Date
}, {
  timestamps: true
});

takedownRequestSchema.index({ status: 1, createdAt: -1 });
takedownRequestSchema.index({ 'targetContent.contentId': 1 });
takedownRequestSchema.index({ contentOwner: 1 });

module.exports = mongoose.model('TakedownRequest', takedownRequestSchema);
