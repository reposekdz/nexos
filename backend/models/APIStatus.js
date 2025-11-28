const mongoose = require('mongoose');
const apiStatusSchema = new mongoose.Schema({
  component: { type: String, required: true, index: true },
  status: { type: String, enum: ['operational', 'degraded', 'partial_outage', 'major_outage', 'maintenance'], default: 'operational' },
  region: { type: String, default: 'global' },
  metrics: { uptime: Number, responseTime: Number, errorRate: Number, throughput: Number },
  lastChecked: { type: Date, default: Date.now },
  lastIncident: Date,
  currentIncident: { type: mongoose.Schema.Types.ObjectId, ref: 'Incident' },
  statusChangedAt: Date,
  metadata: mongoose.Schema.Types.Mixed
}, { timestamps: true });
apiStatusSchema.index({ component: 1, region: 1 });
module.exports = mongoose.model('APIStatus', apiStatusSchema);