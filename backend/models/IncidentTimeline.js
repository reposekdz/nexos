const mongoose = require('mongoose');
const incidentTimelineSchema = new mongoose.Schema({
  incident: { type: mongoose.Schema.Types.ObjectId, ref: 'Incident', required: true, index: true },
  eventType: { type: String, enum: ['detected', 'update', 'status_change', 'escalation', 'communication', 'action', 'resolved'], required: true },
  description: { type: String, required: true },
  actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  automated: { type: Boolean, default: false },
  visibility: { type: String, enum: ['internal', 'public'], default: 'internal' },
  attachments: [{ type: String, url: String, name: String }],
  metrics: mongoose.Schema.Types.Mixed,
  tags: [String],
  metadata: mongoose.Schema.Types.Mixed
}, { timestamps: true });
incidentTimelineSchema.index({ incident: 1, createdAt: 1 });
module.exports = mongoose.model('IncidentTimeline', incidentTimelineSchema);