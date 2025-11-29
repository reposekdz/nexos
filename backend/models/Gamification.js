const mongoose = require('mongoose');

const UserLevelSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
  currentLevel: { type: Number, default: 1, min: 1 },
  totalXP: { type: Number, default: 0 },
  currentLevelXP: { type: Number, default: 0 },
  nextLevelXP: { type: Number, default: 100 },
  rank: String,
  rankIcon: String,
  prestigeLevel: { type: Number, default: 0 },
  statistics: {
    postsCreated: { type: Number, default: 0 },
    commentsPosted: { type: Number, default: 0 },
    likesReceived: { type: Number, default: 0 },
    sharesReceived: { type: Number, default: 0 },
    followersGained: { type: Number, default: 0 },
    tasksCompleted: { type: Number, default: 0 },
    eventsAttended: { type: Number, default: 0 },
    challengesWon: { type: Number, default: 0 }
  },
  history: [{
    level: Number,
    achievedAt: { type: Date, default: Date.now },
    xpGained: Number,
    reason: String
  }]
}, { timestamps: true });

UserLevelSchema.methods.addXP = function(amount, reason) {
  this.totalXP += amount;
  this.currentLevelXP += amount;
  
  while (this.currentLevelXP >= this.nextLevelXP) {
    this.currentLevelXP -= this.nextLevelXP;
    this.currentLevel++;
    this.nextLevelXP = Math.floor(this.nextLevelXP * 1.5);
    
    this.history.push({
      level: this.currentLevel,
      achievedAt: new Date(),
      xpGained: amount,
      reason
    });
  }
  
  this.updateRank();
};

UserLevelSchema.methods.updateRank = function() {
  if (this.currentLevel >= 100) this.rank = 'Legend';
  else if (this.currentLevel >= 75) this.rank = 'Master';
  else if (this.currentLevel >= 50) this.rank = 'Expert';
  else if (this.currentLevel >= 25) this.rank = 'Advanced';
  else if (this.currentLevel >= 10) this.rank = 'Intermediate';
  else this.rank = 'Beginner';
};

const AchievementSchema = new mongoose.Schema({
  achievementId: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  description: String,
  category: { 
    type: String, 
    enum: ['social', 'content', 'engagement', 'community', 'special', 'milestone', 'seasonal'],
    required: true 
  },
  icon: String,
  badge: String,
  color: String,
  rarity: { 
    type: String, 
    enum: ['common', 'uncommon', 'rare', 'epic', 'legendary'], 
    default: 'common' 
  },
  points: { type: Number, required: true },
  xpReward: { type: Number, default: 0 },
  requirements: [{
    type: { type: String, enum: ['count', 'streak', 'threshold', 'completion', 'event'] },
    metric: String,
    operator: { type: String, enum: ['eq', 'gte', 'lte'] },
    value: Number,
    unit: String
  }],
  prerequisites: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Achievement' }],
  rewards: [{
    type: { type: String, enum: ['badge', 'title', 'avatar', 'theme', 'feature'] },
    itemId: String,
    duration: Number
  }],
  hidden: { type: Boolean, default: false },
  repeatable: { type: Boolean, default: false },
  seasonal: {
    startDate: Date,
    endDate: Date
  },
  unlockCount: { type: Number, default: 0 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

AchievementSchema.index({ category: 1, rarity: 1 });

const UserAchievementSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  achievement: { type: mongoose.Schema.Types.ObjectId, ref: 'Achievement', required: true },
  unlockedAt: { type: Date, default: Date.now },
  progress: {
    current: { type: Number, default: 0 },
    required: Number,
    percentage: { type: Number, default: 0 }
  },
  completed: { type: Boolean, default: false },
  displayedInProfile: { type: Boolean, default: true },
  featured: { type: Boolean, default: false }
}, { timestamps: true });

UserAchievementSchema.index({ userId: 1, achievement: 1 }, { unique: true });
UserAchievementSchema.index({ userId: 1, completed: 1 });

const LeaderboardSchema = new mongoose.Schema({
  leaderboardId: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  description: String,
  type: { 
    type: String, 
    enum: ['global', 'group', 'event', 'challenge', 'seasonal'], 
    required: true 
  },
  metric: { type: String, required: true },
  period: { 
    type: String, 
    enum: ['all_time', 'yearly', 'monthly', 'weekly', 'daily', 'custom'], 
    default: 'all_time' 
  },
  periodStart: Date,
  periodEnd: Date,
  scope: {
    groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'Group' },
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant' },
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event' }
  },
  entries: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    score: { type: Number, required: true },
    rank: Number,
    previousRank: Number,
    metadata: mongoose.Schema.Types.Mixed,
    updatedAt: { type: Date, default: Date.now }
  }],
  rewards: [{
    rank: Number,
    type: { type: String, enum: ['badge', 'points', 'title', 'prize'] },
    value: mongoose.Schema.Types.Mixed
  }],
  updateFrequency: { type: String, enum: ['realtime', 'hourly', 'daily'], default: 'realtime' },
  lastUpdate: Date,
  active: { type: Boolean, default: true }
}, { timestamps: true });

LeaderboardSchema.index({ type: 1, active: 1 });
LeaderboardSchema.index({ 'entries.userId': 1 });

LeaderboardSchema.methods.updateRanks = function() {
  this.entries.sort((a, b) => b.score - a.score);
  this.entries.forEach((entry, index) => {
    entry.previousRank = entry.rank;
    entry.rank = index + 1;
  });
  this.lastUpdate = new Date();
};

const ChallengeSchema = new mongoose.Schema({
  challengeId: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  description: String,
  type: { 
    type: String, 
    enum: ['daily', 'weekly', 'monthly', 'event', 'custom'], 
    required: true 
  },
  category: { type: String, enum: ['social', 'content', 'fitness', 'learning', 'community'] },
  icon: String,
  banner: String,
  difficulty: { type: String, enum: ['easy', 'medium', 'hard', 'extreme'], default: 'medium' },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  goals: [{
    goalId: String,
    description: String,
    metric: String,
    target: Number,
    unit: String,
    points: Number
  }],
  rewards: {
    xp: Number,
    points: Number,
    badges: [String],
    items: [mongoose.Schema.Types.Mixed]
  },
  participants: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    joinedAt: { type: Date, default: Date.now },
    progress: [{
      goalId: String,
      current: Number,
      completed: Boolean,
      completedAt: Date
    }],
    totalProgress: { type: Number, default: 0 },
    completed: { type: Boolean, default: false },
    completedAt: Date,
    rank: Number
  }],
  maxParticipants: Number,
  minParticipants: Number,
  teamBased: { type: Boolean, default: false },
  status: { 
    type: String, 
    enum: ['upcoming', 'active', 'completed', 'cancelled'], 
    default: 'upcoming',
    index: true
  },
  visibility: { type: String, enum: ['public', 'private', 'invite_only'], default: 'public' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

ChallengeSchema.index({ status: 1, startDate: 1 });
ChallengeSchema.index({ type: 1, category: 1 });

const StreakSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: { 
    type: String, 
    enum: ['daily_login', 'posting', 'commenting', 'learning', 'fitness', 'custom'],
    required: true 
  },
  currentStreak: { type: Number, default: 0 },
  longestStreak: { type: Number, default: 0 },
  totalDays: { type: Number, default: 0 },
  lastActivity: Date,
  streakStartDate: Date,
  freezesAvailable: { type: Number, default: 0 },
  freezesUsed: { type: Number, default: 0 },
  milestones: [{
    days: Number,
    achievedAt: Date,
    reward: mongoose.Schema.Types.Mixed
  }],
  history: [{
    date: Date,
    maintained: Boolean,
    frozen: Boolean
  }]
}, { timestamps: true });

StreakSchema.index({ userId: 1, type: 1 }, { unique: true });

StreakSchema.methods.updateStreak = function() {
  const now = new Date();
  const lastActivity = this.lastActivity ? new Date(this.lastActivity) : null;
  
  if (!lastActivity) {
    this.currentStreak = 1;
    this.longestStreak = 1;
    this.totalDays = 1;
    this.streakStartDate = now;
  } else {
    const daysDiff = Math.floor((now - lastActivity) / (1000 * 60 * 60 * 24));
    
    if (daysDiff === 0) {
      return;
    } else if (daysDiff === 1) {
      this.currentStreak++;
      this.totalDays++;
      if (this.currentStreak > this.longestStreak) {
        this.longestStreak = this.currentStreak;
      }
    } else if (daysDiff > 1) {
      if (this.freezesAvailable > 0 && daysDiff <= 2) {
        this.freezesAvailable--;
        this.freezesUsed++;
        this.history.push({ date: lastActivity, maintained: true, frozen: true });
      } else {
        this.currentStreak = 1;
        this.streakStartDate = now;
      }
    }
  }
  
  this.lastActivity = now;
  this.history.push({ date: now, maintained: true, frozen: false });
};

const RewardSchema = new mongoose.Schema({
  rewardId: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  description: String,
  type: { 
    type: String, 
    enum: ['badge', 'title', 'avatar', 'theme', 'feature', 'currency', 'item', 'discount'],
    required: true 
  },
  category: String,
  icon: String,
  image: String,
  rarity: { type: String, enum: ['common', 'uncommon', 'rare', 'epic', 'legendary'], default: 'common' },
  cost: {
    points: Number,
    currency: String,
    amount: Number
  },
  value: mongoose.Schema.Types.Mixed,
  availability: {
    startDate: Date,
    endDate: Date,
    maxQuantity: Number,
    remainingQuantity: Number
  },
  requirements: [{
    type: { type: String, enum: ['level', 'achievement', 'points', 'streak'] },
    value: mongoose.Schema.Types.Mixed
  }],
  redeemCount: { type: Number, default: 0 },
  active: { type: Boolean, default: true }
}, { timestamps: true });

RewardSchema.index({ type: 1, active: 1 });

const UserRewardSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  reward: { type: mongoose.Schema.Types.ObjectId, ref: 'Reward', required: true },
  redeemedAt: { type: Date, default: Date.now },
  expiresAt: Date,
  status: { 
    type: String, 
    enum: ['active', 'used', 'expired', 'revoked'], 
    default: 'active' 
  },
  usedAt: Date,
  metadata: mongoose.Schema.Types.Mixed
}, { timestamps: true });

UserRewardSchema.index({ userId: 1, status: 1 });

const PointsTransactionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: { 
    type: String, 
    enum: ['earned', 'spent', 'awarded', 'deducted', 'transferred', 'expired'],
    required: true 
  },
  amount: { type: Number, required: true },
  balance: Number,
  reason: String,
  source: {
    type: { type: String, enum: ['action', 'achievement', 'challenge', 'reward', 'admin', 'transfer'] },
    id: String,
    details: mongoose.Schema.Types.Mixed
  },
  metadata: mongoose.Schema.Types.Mixed,
  timestamp: { type: Date, default: Date.now, index: true }
}, { timestamps: true });

PointsTransactionSchema.index({ userId: 1, timestamp: -1 });
PointsTransactionSchema.index({ type: 1 });

module.exports = {
  UserLevel: mongoose.model('UserLevel', UserLevelSchema),
  Achievement: mongoose.model('Achievement', AchievementSchema),
  UserAchievement: mongoose.model('UserAchievement', UserAchievementSchema),
  Leaderboard: mongoose.model('Leaderboard', LeaderboardSchema),
  Challenge: mongoose.model('Challenge', ChallengeSchema),
  Streak: mongoose.model('Streak', StreakSchema),
  Reward: mongoose.model('Reward', RewardSchema),
  UserReward: mongoose.model('UserReward', UserRewardSchema),
  PointsTransaction: mongoose.model('PointsTransaction', PointsTransactionSchema)
};
