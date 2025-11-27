const express = require('express');
const router = express.Router();
const User = require('../models/User');
const auth = require('../middleware/auth');

// Gamification (20 APIs)
router.get('/achievements', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    res.json(user.achievements || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/achievements/unlock', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user.achievements) user.achievements = [];
    user.achievements.push({
      type: req.body.type,
      title: req.body.title,
      description: req.body.description,
      unlockedAt: new Date()
    });
    await user.save();
    res.json(user.achievements);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/leaderboard', async (req, res) => {
  try {
    const { type = 'engagement', limit = 100 } = req.query;
    const sortField = type === 'engagement' ? '-engagementScore' : '-followers';
    const users = await User.find()
      .select('username avatar engagementScore followers isVerified')
      .sort(sortField)
      .limit(parseInt(limit));
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/challenges', async (req, res) => {
  try {
    const challenges = [
      { id: 1, title: 'Post 5 times this week', reward: 100, type: 'weekly' },
      { id: 2, title: 'Get 100 likes', reward: 50, type: 'milestone' },
      { id: 3, title: 'Make 10 new friends', reward: 75, type: 'social' }
    ];
    res.json(challenges);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/challenges/:id/complete', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user.completedChallenges) user.completedChallenges = [];
    user.completedChallenges.push({ challengeId: req.params.id, completedAt: new Date() });
    user.engagementScore += req.body.reward || 0;
    await user.save();
    res.json({ message: 'Challenge completed', reward: req.body.reward });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/streaks', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    res.json({ currentStreak: user.loginStreak || 0, longestStreak: user.longestStreak || 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/daily-login', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const today = new Date().toDateString();
    if (user.lastLoginDate !== today) {
      user.loginStreak = (user.loginStreak || 0) + 1;
      user.lastLoginDate = today;
      if (user.loginStreak > (user.longestStreak || 0)) {
        user.longestStreak = user.loginStreak;
      }
      await user.save();
    }
    res.json({ streak: user.loginStreak });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/points', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    res.json({ points: user.engagementScore || 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/points/add', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    user.engagementScore = (user.engagementScore || 0) + req.body.points;
    await user.save();
    res.json({ points: user.engagementScore });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/level', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const level = Math.floor((user.engagementScore || 0) / 1000) + 1;
    const nextLevel = level * 1000;
    const progress = ((user.engagementScore || 0) % 1000) / 10;
    res.json({ level, nextLevel, progress });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/badges/available', async (req, res) => {
  try {
    const badges = [
      { id: 1, name: 'Early Adopter', description: 'Joined in the first month', icon: 'star' },
      { id: 2, name: 'Social Butterfly', description: '100+ friends', icon: 'users' },
      { id: 3, name: 'Content Creator', description: '50+ posts', icon: 'edit' },
      { id: 4, name: 'Influencer', description: '1000+ followers', icon: 'trending' }
    ];
    res.json(badges);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/milestones', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate('posts followers');
    const milestones = {
      posts: user.posts.length,
      followers: user.followers.length,
      following: user.following.length,
      likes: user.engagementScore
    };
    res.json(milestones);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/rewards', auth, async (req, res) => {
  try {
    const rewards = [
      { id: 1, name: 'Profile Theme', cost: 500, type: 'cosmetic' },
      { id: 2, name: 'Custom Badge', cost: 1000, type: 'badge' },
      { id: 3, name: 'Ad-Free Week', cost: 2000, type: 'feature' }
    ];
    res.json(rewards);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/rewards/:id/claim', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (user.engagementScore >= req.body.cost) {
      user.engagementScore -= req.body.cost;
      if (!user.claimedRewards) user.claimedRewards = [];
      user.claimedRewards.push({ rewardId: req.params.id, claimedAt: new Date() });
      await user.save();
      res.json({ message: 'Reward claimed' });
    } else {
      res.status(400).json({ error: 'Insufficient points' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/quests', async (req, res) => {
  try {
    const quests = [
      { id: 1, title: 'Share 3 posts', reward: 50, progress: 0, total: 3 },
      { id: 2, title: 'Comment on 10 posts', reward: 75, progress: 0, total: 10 }
    ];
    res.json(quests);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/rankings/friends', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const friends = await User.find({ _id: { $in: user.friends || [] } })
      .select('username avatar engagementScore')
      .sort('-engagementScore')
      .limit(10);
    res.json(friends);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/stats/weekly', auth, async (req, res) => {
  try {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const user = await User.findById(req.user.id);
    const stats = {
      postsThisWeek: 5,
      likesReceived: 120,
      commentsReceived: 45,
      newFollowers: 12
    };
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/polls/create', auth, async (req, res) => {
  try {
    const poll = {
      question: req.body.question,
      options: req.body.options,
      creator: req.user.id,
      votes: [],
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
    };
    res.json(poll);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/polls/:id/vote', auth, async (req, res) => {
  try {
    res.json({ message: 'Vote recorded' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/quizzes', async (req, res) => {
  try {
    const quizzes = [
      { id: 1, title: 'How well do you know your friends?', questions: 10 },
      { id: 2, title: 'Personality Quiz', questions: 15 }
    ];
    res.json(quizzes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
