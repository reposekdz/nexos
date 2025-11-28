const mongoose = require('mongoose');
const heatmapSchema = new mongoose.Schema({
  pageUrl: { type: String, required: true, index: true },
  pageName: String,
  date: { type: Date, required: true },
  device: { type: String, enum: ['mobile', 'tablet', 'desktop'], default: 'desktop' },
  viewport: { width: Number, height: Number },
  dataPoints: [{ x: Number, y: Number, count: Number, elementId: String, elementClass: String, actionType: { type: String, enum: ['click', 'tap', 'scroll', 'hover'] } }],
  aggregatedData: mongoose.Schema.Types.Mixed,
  sampleSize: Number,
  sessionCount: Number,
  computedAt: { type: Date, default: Date.now }
}, { timestamps: true });
heatmapSchema.index({ pageUrl: 1, date: -1, device: 1 });
module.exports = mongoose.model('Heatmap', heatmapSchema);