const express = require('express');
const User = require('../models/User');
const FriendRequest = require('../models/FriendRequest');
const Friendship = require('../models/Friendship');
const Notification = require('../models/Notification');
const auth = require('../middleware/auth');
const router = express.Router();

// Send Friend Request
router.post('/request', auth, async (req, res) => {
  try {
    const { userId, message } = req.body;
    
    if (userId === req.user.id) {
      return res.status(400).json({ error: 'Cannot send friend request to yourself' });
    }

    const existing = await FriendRequest.findOne({
      from: req.user.id,
      to: userId,
      status: 'pending'
    });

    if (existing) {
      return res.status(400).json({ error: 'Friend request already sent' });
    }

    const friendship = await Friendship.findOne({
      $or: [
        { user1: req.user.id, user2: userId },
        { user1: userId, user2: req.user.id }
      ]
    });

    if (friendship) {
      return res.status(400).json({ error: 'Already friends' });
    }

    const friendRequest = await FriendRequest.create({
      from: req.user.id,
      to: userId,
      message: message || ''
    });

    await Notification.create({
      recipient: userId,
      sender: req.user.id,
      type: 'friend_request',
      title: 'New Friend Request',
      message: 'sent you a friend request',
      data: { friendRequestId: friendRequest._id }
    });

    if (global.io) {
      global.io.to(userId.toString()).emit('friend_request', {
        from: req.user.id,
        requestId: friendRequest._id
      });
    }

    res.status(201).json(friendRequest);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Accept Friend Request
router.post('/request/:id/accept', auth, async (req, res) => {
  try {
    const friendRequest = await FriendRequest.findOne({
      _id: req.params.id,
      to: req.user.id,
      status: 'pending'
    });

    if (!friendRequest) {
      return res.status(404).json({ error: 'Friend request not found' });
    }

    friendRequest.status = 'accepted';
    friendRequest.respondedAt = new Date();
    await friendRequest.save();

    await Friendship.create({
      user1: friendRequest.from,
      user2: friendRequest.to
    });

    await Notification.create({
      recipient: friendRequest.from,
      sender: req.user.id,
      type: 'friend_request_accepted',
      title: 'Friend Request Accepted',
      message: 'accepted your friend request'
    });

    if (global.io) {
      global.io.to(friendRequest.from.toString()).emit('friend_request_accepted', {
        userId: req.user.id
      });
    }

    res.json({ message: 'Friend request accepted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Decline Friend Request
router.post('/request/:id/decline', auth, async (req, res) => {
  try {
    const { message } = req.body;
    const friendRequest = await FriendRequest.findOne({
      _id: req.params.id,
      to: req.user.id,
      status: 'pending'
    });

    if (!friendRequest) {
      return res.status(404).json({ error: 'Friend request not found' });
    }

    friendRequest.status = 'declined';
    friendRequest.respondedAt = new Date();
    friendRequest.responseMessage = message;
    await friendRequest.save();

    res.json({ message: 'Friend request declined' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Cancel Friend Request
router.delete('/request/:id', auth, async (req, res) => {
  try {
    const friendRequest = await FriendRequest.findOne({
      _id: req.params.id,
      from: req.user.id,
      status: 'pending'
    });

    if (!friendRequest) {
      return res.status(404).json({ error: 'Friend request not found' });
    }

    friendRequest.status = 'canceled';
    await friendRequest.save();

    res.json({ message: 'Friend request canceled' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get Pending Friend Requests
router.get('/requests', auth, async (req, res) => {
  try {
    const { type = 'received' } = req.query;
    
    const query = {
      status: 'pending'
    };

    if (type === 'received') {
      query.to = req.user.id;
    } else {
      query.from = req.user.id;
    }

    const requests = await FriendRequest.find(query)
      .populate('from', 'username fullName avatar')
      .populate('to', 'username fullName avatar')
      .sort({ createdAt: -1 });

    res.json(requests);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get Friends List
router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    
    const friendships = await Friendship.find({
      $or: [
        { user1: req.user.id },
        { user2: req.user.id }
      ]
    });

    const friendIds = friendships.map(f => 
      f.user1.toString() === req.user.id ? f.user2 : f.user1
    );

    let query = { _id: { $in: friendIds } };
    if (search) {
      query.$or = [
        { username: { $regex: search, $options: 'i' } },
        { fullName: { $regex: search, $options: 'i' } }
      ];
    }

    const friends = await User.find(query)
      .select('username fullName avatar bio isVerified isOnline lastSeen')
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await User.countDocuments(query);

    res.json({
      friends,
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

// Unfriend
router.delete('/:userId', auth, async (req, res) => {
  try {
    const friendship = await Friendship.findOneAndDelete({
      $or: [
        { user1: req.user.id, user2: req.params.userId },
        { user1: req.params.userId, user2: req.user.id }
      ]
    });

    if (!friendship) {
      return res.status(404).json({ error: 'Friendship not found' });
    }

    res.json({ message: 'Friend removed successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get Mutual Friends
router.get('/mutual/:userId', auth, async (req, res) => {
  try {
    const myFriendships = await Friendship.find({
      $or: [
        { user1: req.user.id },
        { user2: req.user.id }
      ]
    });

    const myFriendIds = myFriendships.map(f => 
      f.user1.toString() === req.user.id ? f.user2.toString() : f.user1.toString()
    );

    const theirFriendships = await Friendship.find({
      $or: [
        { user1: req.params.userId },
        { user2: req.params.userId }
      ]
    });

    const theirFriendIds = theirFriendships.map(f => 
      f.user1.toString() === req.params.userId ? f.user2.toString() : f.user1.toString()
    );

    const mutualIds = myFriendIds.filter(id => theirFriendIds.includes(id));

    const mutualFriends = await User.find({ _id: { $in: mutualIds } })
      .select('username fullName avatar isVerified');

    res.json({
      count: mutualFriends.length,
      friends: mutualFriends
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;