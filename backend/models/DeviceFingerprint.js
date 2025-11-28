const mongoose = require('mongoose');

const deviceFingerprintSchema = new mongoose.Schema({
  fingerprint: { type: String, required: true, unique: true, index: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  signals: {
    userAgent: String,
    platform: String,
    screenResolution: String,
    timezone: String,
    language: String,
    plugins: [String],
    fonts: [String],
    canvas: String,
    webgl: String,
    audio: String
  },
  trustScore: { type: Number, default: 50, min: 0, max: 100 },
  riskFactors: [{
    factor: String,
    severity: { type: String, enum: ['low', 'medium', 'high'] },
    detectedAt: Date
  }],
  associations: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    confidence: Number,
    firstSeen: Date,
    lastSeen: Date
  }],
  firstSeen: { type: Date, default: Date.now },
  lastSeen: { type: Date, default: Date.now },
  seenCount: { type: Number, default: 1 },
  blocklisted: { type: Boolean, default: false },
  blockReason: String,
  metadata: mongoose.Schema.Types.Mixed
}, { timestamps: true });

deviceFingerprintSchema.index({ fingerprint: 1 });
deviceFingerprintSchema.index({ user: 1, lastSeen: -1 });
deviceFingerprintSchema.index({ trustScore: 1 });

module.exports = mongoose.model('DeviceFingerprint', deviceFingerprintSchema);
