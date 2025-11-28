const mongoose = require('mongoose');

const suggestionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  suggestedUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  reason: { type: String, enum: ['mutual_friends', 'same_location', 'same_interests', 'contact_import'], required: true },
  score: { type: Number, default: 0 },
  mutualFriendsCount: { type: Number, default: 0 },
  status: { type: String, enum: ['active', 'dismissed', 'accepted'], default: 'active' },
  expiresAt: { type: Date, default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) }
}, { timestamps: true });

suggestionSchema.index({ user: 1, status: 1, score: -1 });
suggestionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Suggestion', suggestionSchema);