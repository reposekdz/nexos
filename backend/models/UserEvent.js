const mongoose = require('mongoose');
const userEventSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  sessionId: { type: String, index: true },
  eventType: { type: String, required: true, index: true },
  eventCategory: { type: String, index: true },
  eventAction: String,
  eventLabel: String,
  eventValue: Number,
  properties: mongoose.Schema.Types.Mixed,
  page: { url: String, title: String, referrer: String },
  device: { type: { type: String }, os: String, browser: String },
  location: { country: String, region: String, city: String },
  timestamp: { type: Date, default: Date.now, index: 1 },
  processed: { type: Boolean, default: false }
}, { timestamps: false });
userEventSchema.index({ eventType: 1, timestamp: -1 });
userEventSchema.index({ user: 1, timestamp: -1 });
module.exports = mongoose.model('UserEvent', userEventSchema);