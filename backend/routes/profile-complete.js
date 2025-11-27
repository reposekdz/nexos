const express = require('express');
const router = express.Router();
const User = require('../models/User');
const auth = require('../middleware/auth');

// Complete profile system (30 APIs)
router.post('/type/set', auth, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.user.id, { profileType: req.body.type }, { new: true });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/verify/request', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    user.verificationRequest = { status: 'pending', documents: req.body.documents, submittedAt: new Date() };
    await user.save();
    res.json({ message: 'Verification request submitted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/customize/background', auth, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.user.id, { 
      'customization.background': req.body.background,
      'customization.backgroundType': req.body.type
    }, { new: true });
    res.json(user.customization);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/customize/font', auth, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.user.id, { 'customization.font': req.body.font }, { new: true });
    res.json(user.customization);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/bio/interactive', auth, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.user.id, { 
      'bio.text': req.body.text,
      'bio.embeds': req.body.embeds
    }, { new: true });
    res.json(user.bio);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/insights', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate('posts');
    const insights = {
      totalLikes: user.posts.reduce((sum, p) => sum + p.likes.length, 0),
      totalComments: user.posts.reduce((sum, p) => sum + p.comments.length, 0),
      totalShares: user.posts.reduce((sum, p) => sum + p.shares.length, 0),
      profileViews: user.profileViews,
      engagementRate: user.engagementScore
    };
    res.json(insights);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/location/share', auth, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.user.id, { 
      'location.current': req.body.location,
      'location.coordinates': req.body.coordinates,
      'location.sharing': true
    }, { new: true });
    res.json(user.location);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/avatar/multiple', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user.avatars) user.avatars = [];
    user.avatars.push(...req.body.avatars);
    await user.save();
    res.json(user.avatars);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/cover/video', auth, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.user.id, { 
      coverPhoto: req.body.url,
      coverType: 'video'
    }, { new: true });
    res.json({ coverPhoto: user.coverPhoto, coverType: user.coverType });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/search/advanced', async (req, res) => {
  try {
    const { interests, location, skills, verified } = req.query;
    const filter = {};
    if (interests) filter.interests = { $in: interests.split(',') };
    if (location) filter['location.city'] = location;
    if (skills) filter.skills = { $in: skills.split(',') };
    if (verified) filter.isVerified = true;
    const users = await User.find(filter).select('username avatar bio isVerified').limit(20);
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/checkin', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user.checkins) user.checkins = [];
    user.checkins.push({ location: req.body.location, coordinates: req.body.coordinates, timestamp: new Date() });
    await user.save();
    res.json({ message: 'Checked in', location: req.body.location });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/checkins', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    res.json(user.checkins || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/status/update', auth, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.user.id, { 
      'status.text': req.body.text,
      'status.emoji': req.body.emoji,
      'status.media': req.body.media,
      'status.location': req.body.location
    }, { new: true });
    global.io?.emit('user-status-updated', { userId: req.user.id, status: user.status });
    res.json(user.status);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/skills/add', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user.skills) user.skills = [];
    user.skills.push(...req.body.skills);
    await user.save();
    res.json(user.skills);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/endorsements/:userId/skill', auth, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user.endorsements) user.endorsements = [];
    const endorsement = user.endorsements.find(e => e.skill === req.body.skill);
    if (endorsement) {
      if (!endorsement.users.includes(req.user.id)) {
        endorsement.users.push(req.user.id);
      }
    } else {
      user.endorsements.push({ skill: req.body.skill, users: [req.user.id] });
    }
    await user.save();
    res.json({ message: 'Skill endorsed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
