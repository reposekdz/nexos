const express = require('express');
const router = express.Router();
const User = require('../models/User');
const auth = require('../middleware/auth');

// Profile customization (20 APIs)
router.put('/bio', auth, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.user.id, { bio: req.body.bio }, { new: true });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/cover-photo', auth, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.user.id, { coverPhoto: req.body.coverPhoto }, { new: true });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/social-links', auth, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.user.id, { socialLinks: req.body.socialLinks }, { new: true });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/badges/award', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    user.badges.push({ type: req.body.type, reason: req.body.reason, awardedAt: new Date() });
    await user.save();
    res.json(user.badges);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/privacy', auth, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.user.id, { 
      'privacy.profileVisibility': req.body.profileVisibility,
      'privacy.postVisibility': req.body.postVisibility,
      'privacy.friendListVisibility': req.body.friendListVisibility
    }, { new: true });
    res.json(user.privacy);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/stats', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate('posts followers following');
    const stats = {
      posts: user.posts.length,
      followers: user.followers.length,
      following: user.following.length,
      profileViews: user.profileViews,
      engagementScore: user.engagementScore
    };
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/friend-request/:userId', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user.friendRequests) user.friendRequests = { sent: [], received: [] };
    if (!user.friendRequests.sent.includes(req.params.userId)) {
      user.friendRequests.sent.push(req.params.userId);
      await user.save();
      
      const recipient = await User.findById(req.params.userId);
      if (!recipient.friendRequests) recipient.friendRequests = { sent: [], received: [] };
      recipient.friendRequests.received.push(req.user.id);
      await recipient.save();
    }
    res.json({ message: 'Friend request sent' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/friend-request/:userId/accept', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const friend = await User.findById(req.params.userId);
    
    if (!user.friends) user.friends = [];
    if (!friend.friends) friend.friends = [];
    
    user.friends.push(req.params.userId);
    friend.friends.push(req.user.id);
    
    user.friendRequests.received = user.friendRequests.received.filter(id => id.toString() !== req.params.userId);
    friend.friendRequests.sent = friend.friendRequests.sent.filter(id => id.toString() !== req.user.id);
    
    await user.save();
    await friend.save();
    res.json({ message: 'Friend request accepted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/profiles/create', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user.multipleProfiles) user.multipleProfiles = [];
    user.multipleProfiles.push({ name: req.body.name, type: req.body.type, avatar: req.body.avatar });
    await user.save();
    res.json(user.multipleProfiles);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/profiles', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    res.json(user.multipleProfiles || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/language', auth, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.user.id, { 
      'settings.language': req.body.language,
      'settings.timezone': req.body.timezone,
      'settings.region': req.body.region
    }, { new: true });
    res.json(user.settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/notifications-settings', auth, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.user.id, { 
      'settings.notifications': req.body
    }, { new: true });
    res.json(user.settings.notifications);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/blocked-users', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate('blockedUsers', 'username avatar');
    res.json(user.blockedUsers || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/mute/:userId', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user.mutedUsers) user.mutedUsers = [];
    if (!user.mutedUsers.includes(req.params.userId)) {
      user.mutedUsers.push(req.params.userId);
      await user.save();
    }
    res.json({ message: 'User muted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/restrict/:userId', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user.restrictedUsers) user.restrictedUsers = [];
    if (!user.restrictedUsers.includes(req.params.userId)) {
      user.restrictedUsers.push(req.params.userId);
      await user.save();
    }
    res.json({ message: 'User restricted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/friends', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate('friends', 'username avatar isVerified');
    res.json(user.friends || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/friend-requests', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .populate('friendRequests.received', 'username avatar isVerified')
      .populate('friendRequests.sent', 'username avatar isVerified');
    res.json(user.friendRequests || { sent: [], received: [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/profile-view/:userId', auth, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    user.profileViews += 1;
    if (!user.profileViewers) user.profileViewers = [];
    user.profileViewers.push({ user: req.user.id, viewedAt: new Date() });
    await user.save();
    res.json({ views: user.profileViews });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/profile-viewers', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate('profileViewers.user', 'username avatar');
    res.json(user.profileViewers || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/theme', auth, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.user.id, { 
      'settings.theme': req.body.theme
    }, { new: true });
    res.json(user.settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
