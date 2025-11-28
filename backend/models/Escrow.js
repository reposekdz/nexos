const mongoose = require('mongoose');

const escrowSchema = new mongoose.Schema({
  transaction: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction', required: true, index: true },
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', index: true },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'USD' },
  status: { 
    type: String, 
    enum: ['held', 'partial_release', 'released', 'refunded', 'disputed'], 
    default: 'held' 
  },
  holdReason: String,
  holdUntil: Date,
  releaseConditions: [{
    type: { type: String, enum: ['time_elapsed', 'event_occurred', 'manual_approval', 'auto'] },
    value: mongoose.Schema.Types.Mixed,
    met: { type: Boolean, default: false }
  }],
  releases: [{
    amount: Number,
    releasedAt: Date,
    releasedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reason: String
  }],
  dispute: {
    active: { type: Boolean, default: false },
    openedAt: Date,
    reason: String,
    resolution: String
  },
  fees: { type: Number, default: 0 },
  metadata: mongoose.Schema.Types.Mixed
}, { timestamps: true });

escrowSchema.index({ transaction: 1 });
escrowSchema.index({ status: 1, holdUntil: 1 });

module.exports = mongoose.model('Escrow', escrowSchema);
