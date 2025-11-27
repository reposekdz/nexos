const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  organizer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  description: String,
  startDate: { type: Date, required: true },
  endDate: Date,
  location: {
    name: String,
    address: String,
    coordinates: {
      lat: Number,
      lng: Number
    }
  },
  category: String,
  coverImage: String,
  isPrivate: { type: Boolean, default: false },
  invitedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  attendees: {
    going: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    interested: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    notGoing: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
  },
  discussions: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    message: String,
    createdAt: { type: Date, default: Date.now }
  }],
  reminders: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reminderTime: Date,
    sent: { type: Boolean, default: false }
  }]
}, { timestamps: true });

eventSchema.index({ startDate: 1 });
eventSchema.index({ organizer: 1 });
eventSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Event', eventSchema);