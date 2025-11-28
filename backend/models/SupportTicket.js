const mongoose = require('mongoose');

const supportTicketSchema = new mongoose.Schema({
  ticketNumber: { type: String, required: true, unique: true, index: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  subject: { type: String, required: true },
  description: String,
  status: { 
    type: String, 
    enum: ['open', 'in_progress', 'waiting_customer', 'resolved', 'closed'], 
    default: 'open',
    index: true
  },
  priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
  category: String,
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  context: {
    route: String,
    userAgent: String,
    metadata: mongoose.Schema.Types.Mixed,
    sessionReplay: String
  },
  messages: [{
    from: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    text: String,
    attachments: [String],
    createdAt: { type: Date, default: Date.now }
  }],
  resolution: {
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    resolvedAt: Date,
    notes: String
  },
  sla: {
    firstResponseDue: Date,
    firstResponseAt: Date,
    resolutionDue: Date
  }
}, { timestamps: true });

supportTicketSchema.index({ user: 1, status: 1, createdAt: -1 });
supportTicketSchema.index({ status: 1, priority: -1 });

module.exports = mongoose.model('SupportTicket', supportTicketSchema);
