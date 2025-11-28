const mongoose = require('mongoose');
const emergencyContactSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name: { type: String, required: true, trim: true },
  relationship: { type: String, enum: ['parent', 'sibling', 'spouse', 'partner', 'friend', 'other'] },
  phoneNormalized: { type: String, required: true },
  phoneCountry: String,
  email: { type: String, lowercase: true },
  verified: { type: Boolean, default: false },
  verifiedAt: Date,
  consentGiven: { type: Boolean, default: false },
  consentAt: Date,
  alertsEnabled: { type: Boolean, default: false },
  alertTypes: [{ type: String, enum: ['account_lockout', 'security_breach', 'inactivity', 'user_request'] }],
  lastAlertSent: Date,
  alertCount: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  metadata: mongoose.Schema.Types.Mixed
}, { timestamps: true });
module.exports = mongoose.model('EmergencyContact', emergencyContactSchema);