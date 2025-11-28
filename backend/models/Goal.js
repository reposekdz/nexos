const mongoose = require('mongoose');
const goalSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  goalType: { type: String, enum: ['destination', 'event', 'duration', 'pages_per_session', 'custom'], required: true },
  definition: { eventType: String, url: String, duration: Number, pageCount: Number, filters: mongoose.Schema.Types.Mixed },
  value: Number,
  currency: String,
  conversionWindow: { type: Number, default: 86400000 },
  funnelSteps: [{ order: Number, name: String, eventType: String, required: Boolean }],
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  metrics: { totalAttempts: Number, totalCompletions: Number, conversionRate: Number, totalValue: Number, lastComputedAt: Date },
  alerts: [{ condition: String, threshold: Number, recipients: [String], enabled: Boolean }],
  metadata: mongoose.Schema.Types.Mixed
}, { timestamps: true });
goalSchema.index({ name: 1 });
module.exports = mongoose.model('Goal', goalSchema);