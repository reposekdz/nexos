const mongoose = require('mongoose');

const searchIndexSchema = new mongoose.Schema({
  entityType: { type: String, required: true, index: true },
  entityId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  title: String,
  content: String,
  tags: [String],
  metadata: mongoose.Schema.Types.Mixed,
  acl: [{
    type: { type: String, enum: ['user', 'group', 'public'] },
    id: mongoose.Schema.Types.ObjectId
  }],
  boost: { type: Number, default: 1.0 },
  popularity: { type: Number, default: 0 },
  lastModified: { type: Date, default: Date.now },
  indexed: { type: Boolean, default: true }
}, { timestamps: true });

searchIndexSchema.index({ entityType: 1, entityId: 1 }, { unique: true });
searchIndexSchema.index({ title: 'text', content: 'text', tags: 'text' });
searchIndexSchema.index({ indexed: 1, lastModified: -1 });

module.exports = mongoose.model('SearchIndex', searchIndexSchema);
