const mongoose = require('mongoose');
const funnelSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  steps: [{ order: Number, name: String, eventType: String, filters: mongoose.Schema.Types.Mixed }],
  conversionWindow: { type: Number, default: 86400000 },
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  metrics: { totalEntered: Number, totalCompleted: Number, conversionRate: Number, lastComputedAt: Date },
  stepMetrics: [{ step: Number, entered: Number, completed: Number, dropped: Number, dropRate: Number }],
  metadata: mongoose.Schema.Types.Mixed
}, { timestamps: true });
funnelSchema.index({ name: 1 });
module.exports = mongoose.model('Funnel', funnelSchema);