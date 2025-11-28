const mongoose = require('mongoose');

const callSchema = new mongoose.Schema({
  caller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  callType: { type: String, enum: ['audio', 'video', 'group'], required: true },
  status: { 
    type: String, 
    enum: ['initiated', 'ringing', 'connected', 'ended', 'missed', 'declined', 'failed', 'busy'],
    default: 'initiated'
  },
  startTime: { type: Date, default: Date.now },
  endTime: Date,
  duration: { type: Number, default: 0 },
  quality: {
    video: { bitrate: Number, resolution: String, fps: Number, packetsLost: Number },
    audio: { bitrate: Number, codec: String, packetsLost: Number, jitter: Number }
  },
  features: {
    screenSharing: { enabled: Boolean, startedAt: Date, duration: Number },
    recording: { enabled: Boolean, url: String, duration: Number, size: Number },
    reactions: [{ user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, emoji: String, timestamp: Date }],
    participants: [{ user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, joinedAt: Date, leftAt: Date }]
  },
  webrtc: {
    sessionId: String,
    signaling: [{ type: String, data: mongoose.Schema.Types.Mixed, timestamp: Date }],
    iceServers: [String],
    turnUsed: Boolean
  },
  deviceInfo: {
    caller: { type: String, os: String, browser: String },
    recipient: { type: String, os: String, browser: String }
  },
  encryption: {
    enabled: { type: Boolean, default: true },
    algorithm: { type: String, default: 'AES-256-GCM' },
    keyExchange: String
  },
  metadata: mongoose.Schema.Types.Mixed
}, { timestamps: true });

callSchema.index({ caller: 1, startTime: -1 });
callSchema.index({ recipient: 1, startTime: -1 });
callSchema.index({ status: 1, startTime: -1 });
callSchema.index({ 'webrtc.sessionId': 1 });

module.exports = mongoose.model('Call', callSchema);
