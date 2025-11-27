const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { createNotification } = require('./notifications');
const auth = require('../middleware/auth');

// Follow user
router.post('/:userId/follow', auth, async (req, res) => {
  try {
    const userToFollow = await User.findById(req.params.userId);
    const currentUser = await User.findById(req.user.id);
    
    if (!userToFollow.followers.includes(req.user.id)) {
      userToFollow.followers.push(req.user.id);
      currentUser.following.push(req.params.userId);
      await userToFollow.save();
      await currentUser.save();
      
      await createNotification({
        recipient: req.params.userId,
        sender: req.user.id,
        type: 'follow',
        message: `${currentUser.username} started following you`
      });
      
      global.io?.to(req.params.userId).emit('new-follower', { userId: req.user.id, username: currentUser.username });
    }
    res.json({ message: 'Followed', followers: userToFollow.followers.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Unfollow user
router.post('/:userId/unfollow', auth, async (req, res) => {
  try {
    const userToUnfollow = await User.findById(req.params.userId);
    const currentUser = await User.findById(req.user.id);
    
    userToUnfollow.followers = userToUnfollow.followers.filter(f => f.toString() !== req.user.id);
    currentUser.following = currentUser.following.filter(f => f.toString() !== req.params.userId);
    await userToUnfollow.save();
    await currentUser.save();
    
    res.json({ message: 'Unfollowed', followers: userToUnfollow.followers.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get followers
router.get('/:userId/followers', auth, async (req, res) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const user = await User.findById(req.params.userId).populate({
      path: 'followers',
      select: 'username fullName avatar bio isVerified followers following',
      options: { skip: (page - 1) * limit, limit: parseInt(limit) }
    });
    
    let followers = user.followers;
    if (search) {
      followers = followers.filter(f => f.username.includes(search) || f.fullName.includes(search));
    }
    
    const followersWithStatus = followers.map(f => ({
      ...f.toObject(),
      isFollowing: f.followers.includes(req.user.id),
      isFollowedByYou: user.following?.includes(f._id)
    }));
    
    res.json({ followers: followersWithStatus, total: user.followers.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get following
router.get('/:userId/following', auth, async (req, res) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const user = await User.findById(req.params.userId).populate({
      path: 'following',
      select: 'username fullName avatar bio isVerified followers following',
      options: { skip: (page - 1) * limit, limit: parseInt(limit) }
    });
    
    let following = user.following;
    if (search) {
      following = following.filter(f => f.username.includes(search) || f.fullName.includes(search));
    }
    
    const followingWithStatus = following.map(f => ({
      ...f.toObject(),
      isFollowing: f.followers.includes(req.user.id),
      isFollowedByYou: true
    }));
    
    res.json({ following: followingWithStatus, total: user.following.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get mutual followers
router.get('/:userId/mutual', auth, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    const currentUser = await User.findById(req.user.id);
    const mutual = user.followers.filter(f => currentUser.followers.includes(f));
    const populated = await User.find({ _id: { $in: mutual } }).select('username fullName avatar isVerified');
    res.json({ mutual: populated, count: mutual.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get suggested users
router.get('/suggestions', auth, async (req, res) => {
  try {
    const currentUser = await User.findById(req.user.id);
    const suggestions = await User.find({
      _id: { $nin: [...currentUser.following, req.user.id] },
      followers: { $in: currentUser.following }
    }).limit(10).select('username fullName avatar bio isVerified followers');
    res.json(suggestions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Remove follower
router.delete('/:userId/remove-follower', auth, async (req, res) => {
  try {
    const currentUser = await User.findById(req.user.id);
    const follower = await User.findById(req.params.userId);
    currentUser.followers = currentUser.followers.filter(f => f.toString() !== req.params.userId);
    follower.following = follower.following.filter(f => f.toString() !== req.user.id);
    await currentUser.save();
    await follower.save();
    res.json({ message: 'Follower removed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Block user
router.post('/:userId/block', auth, async (req, res) => {
  try {
    const currentUser = await User.findById(req.user.id);
    if (!currentUser.blockedUsers) currentUser.blockedUsers = [];
    if (!currentUser.blockedUsers.includes(req.params.userId)) {
      currentUser.blockedUsers.push(req.params.userId);
      currentUser.followers = currentUser.followers.filter(f => f.toString() !== req.params.userId);
      currentUser.following = currentUser.following.filter(f => f.toString() !== req.params.userId);
      await currentUser.save();
    }
    res.json({ message: 'User blocked' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
