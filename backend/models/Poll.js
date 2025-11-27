const mongoose = require('mongoose');

const pollSchema = new mongoose.Schema({
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  question: { type: String, required: true },
  options: [{
    text: { type: String, required: true },
    votes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    percentage: { type: Number, default: 0 }
  }],
  totalVotes: { type: Number, default: 0 },
  allowMultipleVotes: { type: Boolean, default: false },
  expiresAt: Date,
  isActive: { type: Boolean, default: true },
  visibility: { type: String, enum: ['public', 'friends', 'private'], default: 'public' }
}, { timestamps: true });

pollSchema.methods.calculatePercentages = function() {
  if (this.totalVotes === 0) {
    this.options.forEach(option => option.percentage = 0);
    return;
  }
  
  this.options.forEach(option => {
    option.percentage = Math.round((option.votes.length / this.totalVotes) * 100);
  });
};

pollSchema.pre('save', function(next) {
  this.totalVotes = this.options.reduce((sum, option) => sum + option.votes.length, 0);
  this.calculatePercentages();
  next();
});

module.exports = mongoose.model('Poll', pollSchema);