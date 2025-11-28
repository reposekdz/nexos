const mongoose = require('mongoose');
const visibilityDecisionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  post: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true, index: true },
  visible: { type: Boolean, required: true },
  score: Number,
  rulesApplied: [{ rule: String, weight: Number, result: Boolean }],
  factors: { userPreferences: mongoose.Schema.Types.Mixed, privacySettings: mongoose.Schema.Types.Mixed, algorithmicScore: Number },
  timestamp: { type: Date, default: Date.now, index: { expires: 2592000 } }
}, { timestamps: false });
visibilityDecisionSchema.index({ user: 1, post: 1, timestamp: -1 });
module.exports = mongoose.model('VisibilityDecision', visibilityDecisionSchema);