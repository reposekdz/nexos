const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  fullName: { type: String, required: true },
  avatar: { type: String, default: '' },
  bio: { type: String, default: '' },
  followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  following: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  posts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Post' }],
  stories: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Story' }],
  reels: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Reel' }],
  groups: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Group' }],
  isVerified: { type: Boolean, default: false },
  isPrivate: { type: Boolean, default: false },
  lastSeen: { type: Date, default: Date.now },
  isOnline: { type: Boolean, default: false },
  twoFactorEnabled: { type: Boolean, default: false },
  twoFactorSecret: String,
  loginHistory: [{
    ip: String,
    userAgent: String,
    location: String,
    timestamp: { type: Date, default: Date.now }
  }],
  activeSessions: [{
    id: String,
    device: String,
    ip: String,
    lastActive: { type: Date, default: Date.now }
  }],
  accountVerified: { type: Boolean, default: false },
  verificationToken: String,
  passwordResetToken: String,
  passwordResetExpires: Date
},
  interests: [String],
  education: [{
    school: String,
    degree: String,
    fieldOfStudy: String,
    startYear: Number,
    endYear: Number
  }],
  work: [{
    company: String,
    position: String,
    startDate: Date,
    endDate: Date,
    current: Boolean
  }],
  location: {
    city: String,
    country: String,
    coordinates: {
      lat: Number,
      lng: Number
    }
  },
  relationshipStatus: String,
  website: String,
  phoneNumber: String,
  dateOfBirth: Date,
  gender: String,
  status: {
    text: String,
    emoji: String,
    expiresAt: Date
  },
  badges: [{
    type: String,
    reason: String,
    awardedAt: Date
  }],
  customUrl: { type: String, unique: true, sparse: true },
  profileViews: { type: Number, default: 0 },
  engagementScore: { type: Number, default: 0 },
  role: { type: String, enum: ['user', 'admin', 'moderator'], default: 'user' },
  monetization: {
    isAdvertiser: { type: Boolean, default: false },
    adRevenueEnabled: { type: Boolean, default: false },
    donationsEnabled: { type: Boolean, default: false },
    subscriptionTiers: [{
      name: String,
      price: Number,
      benefits: [String],
      badgeUrl: String
    }],
    premiumContent: [{
      contentId: mongoose.Schema.Types.ObjectId,
      price: Number
    }]
  }
}, { timestamps: true });

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = async function(password) {
  return await bcrypt.compare(password, this.password);
};

module.exports = mongoose.model('User', userSchema);