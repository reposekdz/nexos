const mongoose = require('mongoose');

const usageMeterSchema = new mongoose.Schema({
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  metric: { type: String, required: true, index: true },
  period: { type: String, required: true },
  value: { type: Number, default: 0 },
  quota: Number,
  alerts: [{
    threshold: Number,
    triggered: Boolean,
    notifiedAt: Date
  }],
  forecast: {
    predicted: Number,
    confidence: Number,
    basedOn: String
  },
  metadata: mongoose.Schema.Types.Mixed
}, { timestamps: true });

usageMeterSchema.index({ organization: 1, metric: 1, period: -1 });

module.exports = mongoose.model('UsageMeter', usageMeterSchema);
