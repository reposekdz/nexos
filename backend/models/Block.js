const mongoose = require('mongoose');

const blockSchema = new mongoose.Schema({
  blocker: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  blocked: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  reason: String,
  reportId: { type: mongoose.Schema.Types.ObjectId, ref: 'Report' }
}, { timestamps: true });

blockSchema.index({ blocker: 1, blocked: 1 }, { unique: true });
blockSchema.index({ blocked: 1 });

module.exports = mongoose.model('Block', blockSchema);