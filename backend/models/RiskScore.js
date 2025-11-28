const mongoose = require('mongoose');

const riskScoreSchema = new mongoose.Schema({
  entity: { type: mongoose.Schema.Types.ObjectId, refPath: 'entityType', required: true, index: true },
  entityType: { type: String, enum: ['User', 'Transaction', 'Order', 'Session'], required: true },
  score: { type: Number, required: true, min: 0, max: 100 },
  level: { type: String, enum: ['low', 'medium', 'high', 'critical'], required: true },
  signals: [{
    name: String,
    value: mongoose.Schema.Types.Mixed,
    weight: Number,
    contribution: Number
  }],
  rules: [{
    ruleId: { type: mongoose.Schema.Types.ObjectId, ref: 'FraudRule' },
    triggered: Boolean,
    action: String
  }],
  action: { type: String, enum: ['allow', 'challenge', 'block', 'escalate'], required: true },
  explanation: String,
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewedAt: Date,
  outcome: { type: String, enum: ['approved', 'rejected', 'pending'] },
  metadata: mongoose.Schema.Types.Mixed
}, { timestamps: true });

riskScoreSchema.index({ entity: 1, entityType: 1, createdAt: -1 });
riskScoreSchema.index({ level: 1, action: 1 });
riskScoreSchema.index({ score: -1 });

module.exports = mongoose.model('RiskScore', riskScoreSchema);
