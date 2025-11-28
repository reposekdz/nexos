const mongoose = require('mongoose');

const contactSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  phoneNumber: { type: String, required: true },
  phoneNormalized: { type: String, required: true, index: true },
  name: { type: String, required: true },
  avatar: String,
  linkedUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  favorite: { type: Boolean, default: false },
  blocked: { type: Boolean, default: false },
  labels: [String],
  customFields: mongoose.Schema.Types.Mixed,
  lastMessageAt: Date,
  unreadCount: { type: Number, default: 0 },
  syncSource: { type: String, enum: ['manual', 'device', 'whatsapp', 'google', 'apple'], default: 'manual' },
  syncedAt: Date
}, { timestamps: true });

contactSchema.index({ owner: 1, phoneNormalized: 1 }, { unique: true });
contactSchema.index({ owner: 1, favorite: 1 });
contactSchema.index({ owner: 1, name: 'text' });

module.exports = mongoose.model('Contact', contactSchema);
