const mongoose = require('mongoose');

const sessionReplaySchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  sessionId: { type: String, required: true, unique: true, index: true },
  events: [{
    type: String,
    data: mongoose.Schema.Types.Mixed,
    timestamp: Number
  }],
  metadata: {
    userAgent: String,
    viewport: { width: Number, height: Number },
    duration: Number,
    route: String
  },
  consent: { type: Boolean, default: false },
  redacted: { type: Boolean, default: true },
  expiresAt: { type: Date, default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) }
}, { timestamps: true });

sessionReplaySchema.index({ sessionId: 1 });
sessionReplaySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('SessionReplay', sessionReplaySchema);
