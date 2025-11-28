const mongoose = require('mongoose');
const customEventSchema = new mongoose.Schema({
  eventName: { type: String, required: true, index: true },
  eventKey: { type: String, required: true, unique: true },
  description: String,
  schema: mongoose.Schema.Types.Mixed,
  category: String,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  isActive: { type: Boolean, default: true },
  samplingRate: { type: Number, min: 0, max: 1, default: 1 },
  quota: { daily: Number, monthly: Number, currentDaily: { type: Number, default: 0 }, currentMonthly: { type: Number, default: 0 } },
  validationRules: mongoose.Schema.Types.Mixed,
  retention: { raw: Number, aggregated: Number },
  analytics: { totalEvents: Number, uniqueUsers: Number, lastEventAt: Date },
  metadata: mongoose.Schema.Types.Mixed
}, { timestamps: true });
customEventSchema.index({ eventKey: 1 });
module.exports = mongoose.model('CustomEvent', customEventSchema);