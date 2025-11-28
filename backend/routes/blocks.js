const express = require('express');
const Block = require('../models/Block');
const User = require('../models/User');
const auth = require('../middleware/auth');
const router = express.Router();

// Block User
router.post('/:userId', auth, async (req, res) => {
  try {
    const { reason } = req.body;
    
    if (req.params.userId === req.user.id) {
      return res.status(400).json({ error: 'Cannot block yourself' });
    }

    const existing = await Block.findOne({
      blocker: req.user.id,
      blocked: req.params.userId
    });

    if (existing) {
      return res.status(400).json({ error: 'User already blocked' });
    }

    const block = await Block.create({
      blocker: req.user.id,
      blocked: req.params.userId,
      reason
    });

    // Remove from friends if exists
    const Friendship = require('../models/Friendship');
    await Friendship.findOneAndDelete({
      $or: [
        { user1: req.user.id, user2: req.params.userId },
        { user1: req.params.userId, user2: req.user.id }
      ]
    });

    // Cancel any pending friend requests
    const FriendRequest = require('../models/FriendRequest');
    await FriendRequest.updateMany({
      $or: [
        { from: req.user.id, to: req.params.userId },
        { from: req.params.userId, to: req.user.id }
      ],
      status: 'pending'
    }, { status: 'canceled' });

    res.json({ message: 'User blocked successfully', block });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Unblock User
router.delete('/:userId', auth, async (req, res) => {
  try {
    const block = await Block.findOneAndDelete({
      blocker: req.user.id,
      blocked: req.params.userId
    });

    if (!block) {
      return res.status(404).json({ error: 'Block not found' });
    }

    res.json({ message: 'User unblocked successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get Blocked Users
router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const blocks = await Block.find({ blocker: req.user.id })
      .populate('blocked', 'username fullName avatar')
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    const total = await Block.countDocuments({ blocker: req.user.id });

    res.json({
      blocks,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Check if User is Blocked
router.get('/check/:userId', auth, async (req, res) => {
  try {
    const block = await Block.findOne({
      blocker: req.user.id,
      blocked: req.params.userId
    });

    res.json({ isBlocked: !!block });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;