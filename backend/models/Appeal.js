const mongoose = require('mongoose');

const appealSchema = new mongoose.Schema({
  reporter: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  moderationActionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ModerationAction'
  },
  contentId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  contentType: {
    type: String,
    enum: ['post', 'comment', 'message', 'user', 'group'],
    required: true
  },
  reason: {
    type: String,
    required: true,
    maxlength: 2000
  },
  evidenceUrls: [{
    type: String
  }],
  status: {
    type: String,
    enum: ['pending', 'under_review', 'approved', 'rejected', 'escalated'],
    default: 'pending'
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reviewNotes: String,
  reviewedAt: Date,
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  slaDeadline: Date,
  escalationLevel: {
    type: Number,
    default: 0
  },
  originalModerationReason: String
}, {
  timestamps: true
});

appealSchema.index({ reporter: 1, status: 1 });
appealSchema.index({ status: 1, createdAt: -1 });
appealSchema.index({ slaDeadline: 1 });

module.exports = mongoose.model('Appeal', appealSchema);
