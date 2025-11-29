const express = require('express');
const {
  UserLevel,
  Achievement,
  UserAchievement,
  Leaderboard,
  Challenge,
  Streak,
  Reward,
  UserReward,
  PointsTransaction
} = require('../models/Gamification');
const auth = require('../middleware/auth');
const router = express.Router();

router.get('/levels/me', auth, async (req, res) => {
  try {
    let userLevel = await UserLevel.findOne({ userId: req.userId });
    
    if (!userLevel) {
      userLevel = new UserLevel({ userId: req.userId });
      await userLevel.save();
    }
    
    res.json(userLevel);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/levels/add-xp', auth, async (req, res) => {
  try {
    let userLevel = await UserLevel.findOne({ userId: req.userId });
    
    if (!userLevel) {
      userLevel = new UserLevel({ userId: req.userId });
    }
    
    const { amount, reason } = req.body;
    userLevel.addXP(amount, reason);
    await userLevel.save();
    
    await PointsTransaction.create({
      transactionId: `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      user: req.userId,
      type: 'xp_gain',
      amount,
      balance: userLevel.totalXP,
      reason,
      source: 'system'
    });
    
    res.json(userLevel);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/achievements', auth, async (req, res) => {
  try {
    const { category, rarity, hidden } = req.query;
    
    const filter = {};
    
    if (category) filter.category = category;
    if (rarity) filter.rarity = rarity;
    if (hidden !== undefined) filter.hidden = hidden === 'true';
    
    const achievements = await Achievement.find(filter)
      .sort({ points: -1 });
    
    const userAchievements = await UserAchievement.find({ user: req.userId });
    const unlockedIds = userAchievements.map(ua => ua.achievement.toString());
    
    const achievementsWithStatus = achievements.map(ach => ({
      ...ach.toObject(),
      unlocked: unlockedIds.includes(ach._id.toString()),
      progress: userAchievements.find(ua => ua.achievement.toString() === ach._id.toString())?.progress || {}
    }));
    
    res.json(achievementsWithStatus);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/achievements/me', auth, async (req, res) => {
  try {
    const userAchievements = await UserAchievement.find({ user: req.userId })
      .populate('achievement')
      .sort({ unlockedAt: -1 });
    
    res.json(userAchievements);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/achievements/:id/unlock', auth, async (req, res) => {
  try {
    const achievement = await Achievement.findById(req.params.id);
    
    if (!achievement) {
      return res.status(404).json({ message: 'Achievement not found' });
    }
    
    const existing = await UserAchievement.findOne({
      user: req.userId,
      achievement: achievement._id
    });
    
    if (existing) {
      return res.status(400).json({ message: 'Achievement already unlocked' });
    }
    
    const userAchievement = new UserAchievement({
      user: req.userId,
      achievement: achievement._id,
      unlockedAt: new Date()
    });
    await userAchievement.save();
    
    achievement.unlockCount += 1;
    await achievement.save();
    
    const userLevel = await UserLevel.findOne({ userId: req.userId });
    if (userLevel && achievement.xpReward > 0) {
      userLevel.addXP(achievement.xpReward, `Unlocked achievement: ${achievement.name}`);
      await userLevel.save();
    }
    
    await PointsTransaction.create({
      transactionId: `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      user: req.userId,
      type: 'achievement',
      amount: achievement.points,
      reason: `Unlocked: ${achievement.name}`,
      source: 'achievement',
      sourceId: achievement._id
    });
    
    res.json(userAchievement);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/achievements/:id/progress', auth, async (req, res) => {
  try {
    const achievement = await Achievement.findById(req.params.id);
    
    if (!achievement) {
      return res.status(404).json({ message: 'Achievement not found' });
    }
    
    let userAchievement = await UserAchievement.findOne({
      user: req.userId,
      achievement: achievement._id
    });
    
    if (!userAchievement) {
      userAchievement = new UserAchievement({
        user: req.userId,
        achievement: achievement._id
      });
    }
    
    Object.assign(userAchievement.progress, req.body.progress);
    userAchievement.progressPercent = req.body.progressPercent || 0;
    await userAchievement.save();
    
    res.json(userAchievement);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/leaderboards', auth, async (req, res) => {
  try {
    const { type, period } = req.query;
    
    const filter = { active: true };
    
    if (type) filter.type = type;
    if (period) filter.period = period;
    
    const leaderboards = await Leaderboard.find(filter)
      .sort({ startDate: -1 });
    
    res.json(leaderboards);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/leaderboards/:id', auth, async (req, res) => {
  try {
    const leaderboard = await Leaderboard.findById(req.params.id)
      .populate('entries.user', 'name avatar');
    
    if (!leaderboard) {
      return res.status(404).json({ message: 'Leaderboard not found' });
    }
    
    const userEntry = leaderboard.entries.find(e => e.user._id.toString() === req.userId);
    
    res.json({
      leaderboard,
      userRank: userEntry?.rank || null,
      userScore: userEntry?.score || null
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/leaderboards/:id/update-score', auth, async (req, res) => {
  try {
    const leaderboard = await Leaderboard.findById(req.params.id);
    
    if (!leaderboard) {
      return res.status(404).json({ message: 'Leaderboard not found' });
    }
    
    const { score } = req.body;
    
    let entry = leaderboard.entries.find(e => e.user.toString() === req.userId);
    
    if (!entry) {
      entry = {
        user: req.userId,
        score,
        lastUpdated: new Date()
      };
      leaderboard.entries.push(entry);
    } else {
      entry.score = score;
      entry.lastUpdated = new Date();
    }
    
    leaderboard.updateRanks();
    await leaderboard.save();
    
    res.json(leaderboard);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/challenges', auth, async (req, res) => {
  try {
    const { type, difficulty, status } = req.query;
    
    const filter = { active: true };
    
    if (type) filter.type = type;
    if (difficulty) filter.difficulty = difficulty;
    if (status) filter.status = status;
    
    const challenges = await Challenge.find(filter)
      .sort({ startDate: -1 });
    
    res.json(challenges);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/challenges/:id/join', auth, async (req, res) => {
  try {
    const challenge = await Challenge.findById(req.params.id);
    
    if (!challenge) {
      return res.status(404).json({ message: 'Challenge not found' });
    }
    
    if (challenge.status !== 'active') {
      return res.status(400).json({ message: 'Challenge is not active' });
    }
    
    const participant = {
      user: req.userId,
      progress: 0,
      completed: false,
      joinedAt: new Date()
    };
    
    challenge.participants.push(participant);
    challenge.participantCount += 1;
    await challenge.save();
    
    res.json(challenge);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/challenges/:id/progress', auth, async (req, res) => {
  try {
    const challenge = await Challenge.findById(req.params.id);
    
    if (!challenge) {
      return res.status(404).json({ message: 'Challenge not found' });
    }
    
    const participant = challenge.participants.find(p => p.user.toString() === req.userId);
    
    if (!participant) {
      return res.status(403).json({ message: 'Not a participant in this challenge' });
    }
    
    participant.progress = req.body.progress;
    
    if (req.body.progress >= 100 && !participant.completed) {
      participant.completed = true;
      participant.completedAt = new Date();
      challenge.completionCount += 1;
      
      const userLevel = await UserLevel.findOne({ userId: req.userId });
      if (userLevel) {
        userLevel.addXP(challenge.rewards.xp, `Completed challenge: ${challenge.name}`);
        await userLevel.save();
      }
      
      if (challenge.rewards.points > 0) {
        await PointsTransaction.create({
          transactionId: `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          user: req.userId,
          type: 'challenge',
          amount: challenge.rewards.points,
          reason: `Completed: ${challenge.name}`,
          source: 'challenge',
          sourceId: challenge._id
        });
      }
    }
    
    await challenge.save();
    
    res.json(challenge);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/streaks/me', auth, async (req, res) => {
  try {
    const streaks = await Streak.find({ user: req.userId })
      .sort({ currentCount: -1 });
    
    res.json(streaks);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/streaks', auth, async (req, res) => {
  try {
    const { type, action } = req.body;
    
    let streak = await Streak.findOne({ user: req.userId, type });
    
    if (!streak) {
      streak = new Streak({
        user: req.userId,
        type,
        action
      });
    }
    
    streak.checkStreak();
    await streak.save();
    
    res.json(streak);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/streaks/:id/freeze', auth, async (req, res) => {
  try {
    const streak = await Streak.findById(req.params.id);
    
    if (!streak) {
      return res.status(404).json({ message: 'Streak not found' });
    }
    
    if (streak.user.toString() !== req.userId) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    if (streak.freezesAvailable <= 0) {
      return res.status(400).json({ message: 'No freezes available' });
    }
    
    streak.freezesAvailable -= 1;
    streak.freezesUsed += 1;
    await streak.save();
    
    res.json(streak);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/rewards', auth, async (req, res) => {
  try {
    const { type, category } = req.query;
    
    const filter = { available: true };
    
    if (type) filter.type = type;
    if (category) filter.category = category;
    
    const now = new Date();
    filter.$or = [
      { 'availability.startDate': { $exists: false } },
      { 'availability.startDate': { $lte: now }, 'availability.endDate': { $gte: now } }
    ];
    
    const rewards = await Reward.find(filter)
      .sort({ cost: 1 });
    
    const userRewards = await UserReward.find({ user: req.userId });
    const redeemedIds = userRewards.map(ur => ur.reward.toString());
    
    const rewardsWithStatus = rewards.map(reward => ({
      ...reward.toObject(),
      redeemed: redeemedIds.includes(reward._id.toString())
    }));
    
    res.json(rewardsWithStatus);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/rewards/:id/redeem', auth, async (req, res) => {
  try {
    const reward = await Reward.findById(req.params.id);
    
    if (!reward) {
      return res.status(404).json({ message: 'Reward not found' });
    }
    
    if (!reward.available) {
      return res.status(400).json({ message: 'Reward not available' });
    }
    
    if (reward.stock !== undefined && reward.stock <= 0) {
      return res.status(400).json({ message: 'Reward out of stock' });
    }
    
    const userPoints = await PointsTransaction.aggregate([
      { $match: { user: req.userId } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    
    const totalPoints = userPoints.length > 0 ? userPoints[0].total : 0;
    
    if (totalPoints < reward.cost) {
      return res.status(400).json({ message: 'Insufficient points' });
    }
    
    const userReward = new UserReward({
      user: req.userId,
      reward: reward._id,
      redeemedAt: new Date(),
      status: 'pending'
    });
    await userReward.save();
    
    await PointsTransaction.create({
      transactionId: `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      user: req.userId,
      type: 'redemption',
      amount: -reward.cost,
      balance: totalPoints - reward.cost,
      reason: `Redeemed: ${reward.name}`,
      source: 'reward',
      sourceId: reward._id
    });
    
    reward.redemptionCount += 1;
    if (reward.stock !== undefined) {
      reward.stock -= 1;
      if (reward.stock <= 0) {
        reward.available = false;
      }
    }
    await reward.save();
    
    res.json(userReward);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/rewards/me', auth, async (req, res) => {
  try {
    const userRewards = await UserReward.find({ user: req.userId })
      .populate('reward')
      .sort({ redeemedAt: -1 });
    
    res.json(userRewards);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/points/balance', auth, async (req, res) => {
  try {
    const result = await PointsTransaction.aggregate([
      { $match: { user: req.userId } },
      { $group: { 
        _id: null, 
        total: { $sum: '$amount' },
        earned: { $sum: { $cond: [{ $gt: ['$amount', 0] }, '$amount', 0] } },
        spent: { $sum: { $cond: [{ $lt: ['$amount', 0] }, '$amount', 0] } }
      }}
    ]);
    
    const balance = result.length > 0 ? result[0] : { total: 0, earned: 0, spent: 0 };
    
    res.json(balance);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/points/transactions', auth, async (req, res) => {
  try {
    const { type } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    
    const filter = { user: req.userId };
    
    if (type) filter.type = type;
    
    const transactions = await PointsTransaction.find(filter)
      .sort({ timestamp: -1 })
      .skip((page - 1) * limit)
      .limit(limit);
    
    const total = await PointsTransaction.countDocuments(filter);
    
    res.json({
      transactions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/dashboard/stats', auth, async (req, res) => {
  try {
    const userLevel = await UserLevel.findOne({ userId: req.userId });
    
    const achievementsUnlocked = await UserAchievement.countDocuments({ user: req.userId });
    const totalAchievements = await Achievement.countDocuments({ hidden: false });
    
    const activeChallenges = await Challenge.countDocuments({
      'participants.user': req.userId,
      'participants.completed': false,
      status: 'active'
    });
    
    const completedChallenges = await Challenge.countDocuments({
      'participants.user': req.userId,
      'participants.completed': true
    });
    
    const activeStreaks = await Streak.countDocuments({
      user: req.userId,
      currentCount: { $gt: 0 }
    });
    
    const pointsResult = await PointsTransaction.aggregate([
      { $match: { user: req.userId } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    
    const totalPoints = pointsResult.length > 0 ? pointsResult[0].total : 0;
    
    res.json({
      level: userLevel?.currentLevel || 1,
      totalXP: userLevel?.totalXP || 0,
      rank: userLevel?.rank || 'Beginner',
      achievementsUnlocked,
      totalAchievements,
      achievementProgress: totalAchievements > 0 ? ((achievementsUnlocked / totalAchievements) * 100).toFixed(2) : 0,
      activeChallenges,
      completedChallenges,
      activeStreaks,
      totalPoints
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
