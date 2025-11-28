const mongoose = require('mongoose');

const fraudRuleSchema = new mongoose.Schema({
  name: { type: String, required: true },
  key: { type: String, required: true, unique: true, index: true },
  description: String,
  status: { type: String, enum: ['active', 'disabled', 'testing'], default: 'active' },
  priority: { type: Number, default: 0 },
  conditions: [{
    field: String,
    operator: { type: String, enum: ['equals', 'not_equals', 'gt', 'lt', 'gte', 'lte', 'in', 'not_in', 'contains', 'regex', 'time_window'] },
    value: mongoose.Schema.Types.Mixed,
    timeWindow: Number
  }],
  action: {
    type: { type: String, enum: ['flag', 'block', 'challenge', 'escalate', 'log'], required: true },
    parameters: mongoose.Schema.Types.Mixed
  },
  threshold: {
    count: Number,
    window: Number,
    cooldown: Number
  },
  metrics: {
    triggered: { type: Number, default: 0 },
    falsePositives: { type: Number, default: 0 },
    truePositives: { type: Number, default: 0 },
    lastTriggered: Date
  },
  feedback: {
    enabled: { type: Boolean, default: true },
    reviewQueue: String
  }
}, { timestamps: true });

fraudRuleSchema.index({ key: 1, status: 1 });
fraudRuleSchema.index({ priority: -1, status: 1 });

module.exports = mongoose.model('FraudRule', fraudRuleSchema);
