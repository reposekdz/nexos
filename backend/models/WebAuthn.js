const mongoose = require('mongoose');

const webAuthnSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  credentialId: { type: String, required: true, unique: true, index: true },
  publicKey: { type: String, required: true },
  counter: { type: Number, default: 0 },
  deviceType: { type: String, enum: ['platform', 'cross-platform'], default: 'platform' },
  transports: [String],
  friendlyName: String,
  aaguid: String,
  attestationType: String,
  trusted: { type: Boolean, default: true },
  lastUsed: Date,
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

webAuthnSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('WebAuthn', webAuthnSchema);
