const mongoose = require('mongoose');

const contentDraftSchema = new mongoose.Schema({
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: { type: String, enum: ['post', 'article', 'page', 'email'], required: true },
  title: String,
  content: mongoose.Schema.Types.Mixed,
  status: { 
    type: String, 
    enum: ['draft', 'review', 'scheduled', 'published', 'archived'], 
    default: 'draft',
    index: true
  },
  publishedVersion: { type: mongoose.Schema.Types.ObjectId, refPath: 'type' },
  scheduledFor: Date,
  embargo: {
    enabled: Boolean,
    releaseDate: Date,
    approvals: [{ user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, approvedAt: Date }]
  },
  dependencies: [{
    type: String,
    id: mongoose.Schema.Types.ObjectId,
    status: String
  }],
  lock: {
    lockedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    lockedAt: Date,
    expiresAt: Date
  },
  comments: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    text: String,
    resolved: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
  }],
  metadata: mongoose.Schema.Types.Mixed
}, { timestamps: true });

contentDraftSchema.index({ author: 1, status: 1, createdAt: -1 });
contentDraftSchema.index({ scheduledFor: 1, status: 1 });

module.exports = mongoose.model('ContentDraft', contentDraftSchema);
