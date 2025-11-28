const mongoose = require('mongoose');

const emailTemplateSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  category: {
    type: String,
    enum: ['transactional', 'promotional', 'notification', 'digest', 'system'],
    required: true
  },
  subject: {
    type: String,
    required: true
  },
  htmlBody: {
    type: String,
    required: true
  },
  textBody: String,
  variables: [{
    name: String,
    description: String,
    required: Boolean,
    defaultValue: String
  }],
  locale: {
    type: String,
    default: 'en'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  version: {
    type: Number,
    default: 1
  },
  testData: Object,
  preheader: String
}, {
  timestamps: true
});

emailTemplateSchema.index({ key: 1, locale: 1 }, { unique: true });
emailTemplateSchema.index({ category: 1, isActive: 1 });

module.exports = mongoose.model('EmailTemplate', emailTemplateSchema);
