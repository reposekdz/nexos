const express = require('express');
const User = require('../models/User');
const Post = require('../models/Post');
const auth = require('../middleware/auth');
const router = express.Router();

// Set user status/mood
router.post('/status', auth, async (req, res) => {
  try {
    const { status, emoji, expiresAt } = req.body;
    
    const user = await User.findByIdAndUpdate(
      req.userId,
      {
        status: {
          text: status,
          emoji,
          expiresAt: expiresAt ? new Date(expiresAt) : new Date(Date.now() + 24 * 60 * 60 * 1000)
        }
      },
      { new: true }
    );
    
    res.json(user.status);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get activity log
router.get('/activity-log', auth, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    
    const activities = await Post.aggregate([
      {
        $match: {
          $or: [
            { author: req.userId },
            { 'comments.user': req.userId },
            { likes: req.userId },
            { shares: req.userId }
          ]
        }
      },
      {
        $project: {
          type: {
            $cond: [
              { $eq: ['$author', req.userId] },
              'post',
              {
                $cond: [
                  { $in: [req.userId, '$likes'] },
                  'like',
                  {
                    $cond: [
                      { $in: [req.userId, '$shares'] },
                      'share',
                      'comment'
                    ]
                  }
                ]
              }
            ]
          },
          content: 1,
          createdAt: 1
        }
      },
      { $sort: { createdAt: -1 } },
      { $limit: limit * page },
      { $skip: (page - 1) * limit }
    ]);
    
    res.json(activities);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get profile completion percentage
router.get('/profile-completion', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    
    const fields = [
      'avatar', 'bio', 'location', 'work', 'education', 
      'interests', 'phoneNumber', 'website'
    ];
    
    let completed = 0;
    fields.forEach(field => {
      if (user[field]) {
        if (Array.isArray(user[field])) {
          if (user[field].length > 0) completed++;
        } else if (typeof user[field] === 'object') {
          if (Object.keys(user[field]).length > 0) completed++;
        } else {
          completed++;
        }
      }
    });
    
    const percentage = Math.round((completed / fields.length) * 100);
    
    res.json({
      percentage,
      completed,
      total: fields.length,
      missing: fields.filter(field => !user[field])
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create custom profile URL
router.post('/custom-url', auth, async (req, res) => {
  try {
    const { customUrl } = req.body;
    
    // Check if URL is available
    const existing = await User.findOne({ customUrl });
    if (existing) {
      return res.status(400).json({ message: 'URL already taken' });
    }
    
    const user = await User.findByIdAndUpdate(
      req.userId,
      { customUrl },
      { new: true }
    );
    
    res.json({ customUrl: user.customUrl });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get personalized recommendations
router.get('/recommendations', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    
    // Friend recommendations based on mutual friends
    const friendRecommendations = await User.aggregate([
      {
        $match: {
          _id: { $nin: [...user.following, req.userId] },
          followers: { $in: user.following }
        }
      },
      {
        $addFields: {
          mutualFriends: {
            $size: {
              $setIntersection: ['$followers', user.following]
            }
          }
        }
      },
      { $sort: { mutualFriends: -1 } },
      { $limit: 10 },
      {
        $project: {
          username: 1,
          fullName: 1,
          avatar: 1,
          mutualFriends: 1
        }
      }
    ]);
    
    // Content recommendations based on interests
    const contentRecommendations = await Post.find({
      tags: { $in: user.interests || [] },
      author: { $ne: req.userId }
    })
    .populate('author', 'username fullName avatar')
    .limit(10)
    .sort({ createdAt: -1 });
    
    res.json({
      friends: friendRecommendations,
      content: contentRecommendations
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Award user badge
router.post('/badges/:userId', auth, async (req, res) => {
  try {
    const { badgeType, reason } = req.body;
    
    const user = await User.findById(req.params.userId);
    
    if (!user.badges) user.badges = [];
    
    user.badges.push({
      type: badgeType,
      reason,
      awardedAt: new Date()
    });
    
    await user.save();
    
    res.json(user.badges);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Post with location visibility
router.post('/post-location', auth, async (req, res) => {
  try {
    const { content, media, location, visibleRadius } = req.body;
    
    const post = new Post({
      author: req.userId,
      content,
      media,
      location: {
        name: location.name,
        coordinates: {
          type: 'Point',
          coordinates: [location.lng, location.lat]
        }
      },
      locationVisibility: {
        enabled: true,
        radius: visibleRadius || 10 // km
      }
    });
    
    await post.save();
    await post.populate('author', 'username fullName avatar');
    
    res.status(201).json(post);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Nested comments
router.post('/posts/:postId/comments/:commentId/reply', auth, async (req, res) => {
  try {
    const { text } = req.body;
    const post = await Post.findById(req.params.postId);
    
    if (!post) return res.status(404).json({ message: 'Post not found' });
    
    const parentComment = post.comments.id(req.params.commentId);
    if (!parentComment) return res.status(404).json({ message: 'Comment not found' });
    
    if (!parentComment.replies) parentComment.replies = [];
    
    parentComment.replies.push({
      user: req.userId,
      text,
      createdAt: new Date()
    });
    
    await post.save();
    await post.populate('comments.user', 'username fullName avatar');
    await post.populate('comments.replies.user', 'username fullName avatar');
    
    res.json(parentComment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Comment voting
router.post('/posts/:postId/comments/:commentId/vote', auth, async (req, res) => {
  try {
    const { voteType } = req.body; // 'up' or 'down'
    const post = await Post.findById(req.params.postId);
    
    if (!post) return res.status(404).json({ message: 'Post not found' });
    
    const comment = post.comments.id(req.params.commentId);
    if (!comment) return res.status(404).json({ message: 'Comment not found' });
    
    if (!comment.votes) comment.votes = { up: [], down: [] };
    
    // Remove previous vote
    comment.votes.up.pull(req.userId);
    comment.votes.down.pull(req.userId);
    
    // Add new vote
    if (voteType === 'up') comment.votes.up.push(req.userId);
    else if (voteType === 'down') comment.votes.down.push(req.userId);
    
    await post.save();
    
    res.json({
      upvotes: comment.votes.up.length,
      downvotes: comment.votes.down.length
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Schedule message
router.post('/schedule-message', auth, async (req, res) => {
  try {
    const { recipient, content, scheduledFor } = req.body;
    
    // Store scheduled message (would use job queue in production)
    const scheduledMessage = {
      sender: req.userId,
      recipient,
      content,
      scheduledFor: new Date(scheduledFor),
      status: 'scheduled'
    };
    
    // In production, use a job queue like Bull or Agenda
    console.log('Message scheduled:', scheduledMessage);
    
    res.json({ message: 'Message scheduled successfully', scheduledMessage });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;