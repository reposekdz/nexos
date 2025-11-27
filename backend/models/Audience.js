const mongoose = require('mongoose');

const audienceSchema = new mongoose.Schema({
  advertiser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  type: { type: String, enum: ['custom', 'lookalike', 'saved'], required: true },
  source: {
    type: { type: String, enum: ['customer_list', 'website_traffic', 'app_activity', 'engagement'] },
    data: [{
      email: String,
      phone: String,
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
    }],
    pixelId: String,
    eventType: String
  },
  size: { type: Number, default: 0 },
  lastUpdated: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Audience', audienceSchema);
