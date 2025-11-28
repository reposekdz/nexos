const mongoose = require('mongoose');

const productTourSchema = new mongoose.Schema({
  name: { type: String, required: true },
  key: { type: String, required: true, unique: true, index: true },
  description: String,
  status: { type: String, enum: ['draft', 'active', 'archived'], default: 'draft' },
  targeting: {
    feature: String,
    userSegments: [String],
    showOnce: { type: Boolean, default: true },
    triggerEvent: String
  },
  steps: [{
    id: String,
    title: String,
    content: String,
    targetElement: String,
    position: { type: String, enum: ['top', 'bottom', 'left', 'right', 'center'], default: 'bottom' },
    action: String,
    checkpoint: Boolean,
    survey: {
      question: String,
      options: [String],
      responseType: String
    },
    order: Number
  }],
  options: {
    allowSkip: { type: Boolean, default: true },
    showProgress: { type: Boolean, default: true },
    overlay: { type: Boolean, default: true },
    pauseInteraction: { type: Boolean, default: false }
  },
  metrics: {
    started: { type: Number, default: 0 },
    completed: { type: Number, default: 0 },
    skipped: { type: Number, default: 0 },
    averageCompletion: Number,
    stepDropoff: mongoose.Schema.Types.Mixed
  }
}, { timestamps: true });

productTourSchema.index({ key: 1, status: 1 });

module.exports = mongoose.model('ProductTour', productTourSchema);
