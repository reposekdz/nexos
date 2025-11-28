const mongoose = require('mongoose');

const contactImportSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  source: { type: String, enum: ['csv', 'google', 'outlook', 'manual'], required: true },
  status: { type: String, enum: ['pending', 'processing', 'completed', 'failed'], default: 'pending' },
  totalContacts: { type: Number, default: 0 },
  processedContacts: { type: Number, default: 0 },
  matchedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  rawData: String,
  error: String,
  processedAt: Date
}, { timestamps: true });

contactImportSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('ContactImport', contactImportSchema);