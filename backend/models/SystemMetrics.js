const mongoose = require('mongoose');

const systemMetricsSchema = new mongoose.Schema({
  timestamp: {
    type: Date,
    default: Date.now,
    required: true
  },
  metricType: {
    type: String,
    enum: ['system', 'api', 'database', 'cache', 'queue', 'custom'],
    required: true
  },
  name: {
    type: String,
    required: true
  },
  value: {
    type: Number,
    required: true
  },
  unit: {
    type: String,
    enum: ['count', 'milliseconds', 'seconds', 'percentage', 'bytes', 'requests_per_second']
  },
  tags: {
    type: Map,
    of: String
  },
  environment: {
    type: String,
    enum: ['development', 'staging', 'production'],
    default: 'production'
  },
  hostname: String,
  instanceId: String
}, {
  timestamps: false
});

systemMetricsSchema.index({ timestamp: -1, metricType: 1, name: 1 });
systemMetricsSchema.index({ timestamp: 1 }, { expireAfterSeconds: 2592000 });

module.exports = mongoose.model('SystemMetrics', systemMetricsSchema);
