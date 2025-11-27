const express = require('express');
const User = require('../models/User');
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');
const router = express.Router();

// Get user profile
router.get('/:username', async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username })
      .populate('posts')
      .populate('followers', 'username fullName avatar')
      .populate('following', 'username fullName avatar')
      .select('-password');
    
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update profile
router.put('/profile', auth, upload.single('avatar'), async (req, res) => {
  try {
    const { fullName, bio, isPrivate } = req.body;
    const updateData = { fullName, bio, isPrivate };
    
    if (req.file) {
      updateData.avatar = req.file.path;
    }
    
    const user = await User.findByIdAndUpdate(
      req.userId,
      updateData,
      { new: true }
    ).select('-password');
    
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Follow user
router.post('/:id/follow', auth, async (req, res) => {
  try {
    const userToFollow = await User.findById(req.params.id);
    const currentUser = await User.findById(req.userId);
    
    if (!userToFollow) return res.status(404).json({ message: 'User not found' });
    
    if (req.params.id === req.userId.toString()) {
      return res.status(400).json({ message: 'Cannot follow yourself' });
    }
    
    const isFollowing = currentUser.following.includes(req.params.id);
    
    if (isFollowing) {
      currentUser.following.pull(req.params.id);
      userToFollow.followers.pull(req.userId);
    } else {
      currentUser.following.push(req.params.id);
      userToFollow.followers.push(req.userId);
    }
    
    await currentUser.save();
    await userToFollow.save();
    
    res.json({ 
      following: !isFollowing,
      followersCount: userToFollow.followers.length,
      followingCount: currentUser.following.length
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Search users
router.get('/search/:query', async (req, res) => {
  try {
    const { query } = req.params;
    const users = await User.find({
      $or: [
        { username: { $regex: query, $options: 'i' } },
        { fullName: { $regex: query, $options: 'i' } }
      ]
    })
    .select('username fullName avatar isVerified')
    .limit(20);
    
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get suggested users
router.get('/suggestions/for-you', auth, async (req, res) => {
  try {
    const currentUser = await User.findById(req.userId);
    const suggestions = await User.find({
      _id: { 
        $nin: [...currentUser.following, req.userId] 
      }
    })
    .select('username fullName avatar isVerified')
    .limit(10);
    
    res.json(suggestions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;