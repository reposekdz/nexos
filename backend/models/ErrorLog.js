const mongoose = require('mongoose');

const errorLogSchema = new mongoose.Schema({
  errorId: {
    type: String,
    unique: true,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  stack: String,
  type: {
    type: String,
    enum: ['system', 'application', 'database', 'external_api', 'validation'],
    default: 'application'
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  context: {
    method: String,
    url: String,
    statusCode: Number,
    requestId: String,
    sessionId: String,
    ipAddress: String,
    userAgent: String,
    headers: Object,
    body: Object,
    query: Object,
    params: Object
  },
  environment: {
    type: String,
    enum: ['development', 'staging', 'production'],
    default: 'production'
  },
  hostname: String,
  instanceId: String,
  resolved: {
    type: Boolean,
    default: false
  },
  resolvedAt: Date,
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  occurrenceCount: {
    type: Number,
    default: 1
  },
  firstOccurrence: Date,
  lastOccurrence: Date,
  tags: [String]
}, {
  timestamps: true
});

errorLogSchema.index({ errorId: 1 });
errorLogSchema.index({ severity: 1, resolved: 1, createdAt: -1 });
errorLogSchema.index({ user: 1, createdAt: -1 });
errorLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 });

module.exports = mongoose.model('ErrorLog', errorLogSchema);
