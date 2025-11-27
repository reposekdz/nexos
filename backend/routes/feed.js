const express = require('express');
const Post = require('../models/Post');
const User = require('../models/User');
const Ad = require('../models/Ad');
const auth = require('../middleware/auth');
const router = express.Router();

// Advanced feed algorithm
router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const user = await User.findById(req.userId).populate('following');
    
    // Get posts from followed users and own posts
    const followingIds = user.following.map(f => f._id);
    const userIds = [...followingIds, req.userId];
    
    // Base query for posts
    const postsQuery = Post.find({
      $or: [
        { author: { $in: userIds } },
        { visibility: 'public' }
      ]
    })
    .populate('author', 'username fullName avatar isVerified')
    .populate('comments.user', 'username fullName avatar')
    .sort({ createdAt: -1 });
    
    // Get posts with engagement scoring
    const posts = await postsQuery
      .limit(limit * page)
      .skip((page - 1) * limit);
    
    // Calculate engagement scores and sort
    const scoredPosts = posts.map(post => {
      const ageHours = (Date.now() - post.createdAt) / (1000 * 60 * 60);
      const engagementScore = (post.likes.length * 1 + post.comments.length * 2 + post.shares.length * 3);
      const timeDecay = Math.exp(-ageHours / 24); // Decay over 24 hours
      const friendshipBoost = followingIds.includes(post.author._id) ? 2 : 1;
      
      const finalScore = engagementScore * timeDecay * friendshipBoost;
      
      return {
        ...post.toObject(),
        engagementScore: finalScore,
        isLiked: post.likes.includes(req.userId),
        likesCount: post.likes.length,
        commentsCount: post.comments.length,
        sharesCount: post.shares.length
      };
    });
    
    // Sort by engagement score
    scoredPosts.sort((a, b) => b.engagementScore - a.engagementScore);
    
    // Inject ads every 5 posts
    const feedWithAds = await injectAds(scoredPosts, req.userId);
    
    res.json({
      posts: feedWithAds,
      hasMore: posts.length === limit,
      page: parseInt(page)
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get trending posts
router.get('/trending', auth, async (req, res) => {
  try {
    const { timeframe = '24h' } = req.query;
    
    let timeFilter = new Date();
    switch (timeframe) {
      case '1h':
        timeFilter.setHours(timeFilter.getHours() - 1);
        break;
      case '24h':
        timeFilter.setDate(timeFilter.getDate() - 1);
        break;
      case '7d':
        timeFilter.setDate(timeFilter.getDate() - 7);
        break;
      default:
        timeFilter.setDate(timeFilter.getDate() - 1);
    }
    
    const trendingPosts = await Post.aggregate([
      {
        $match: {
          createdAt: { $gte: timeFilter },
          visibility: 'public'
        }
      },
      {
        $addFields: {
          engagementScore: {
            $add: [
              { $size: '$likes' },
              { $multiply: [{ $size: '$comments' }, 2] },
              { $multiply: [{ $size: '$shares' }, 3] }
            ]
          }
        }
      },
      {
        $sort: { engagementScore: -1 }
      },
      {
        $limit: 20
      },
      {
        $lookup: {
          from: 'users',
          localField: 'author',
          foreignField: '_id',
          as: 'author'
        }
      },
      {
        $unwind: '$author'
      }
    ]);
    
    res.json(trendingPosts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get personalized recommendations
router.get('/recommendations', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    
    // Get user's interaction history
    const userPosts = await Post.find({ author: req.userId });
    const likedPosts = await Post.find({ likes: req.userId });
    
    // Extract interests from hashtags and content
    const interests = extractInterests(userPosts, likedPosts);
    
    // Find similar posts
    const recommendations = await Post.find({
      author: { $ne: req.userId },
      visibility: 'public',
      $or: [
        { tags: { $in: interests } },
        { content: { $regex: interests.join('|'), $options: 'i' } }
      ]
    })
    .populate('author', 'username fullName avatar')
    .sort({ createdAt: -1 })
    .limit(10);
    
    res.json(recommendations);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Inject ads into feed
const injectAds = async (posts, userId) => {
  try {
    const user = await User.findById(userId);
    
    // Get targeted ads
    const ads = await Ad.find({
      status: 'active',
      'schedule.startDate': { $lte: new Date() },
      $or: [
        { 'schedule.endDate': { $gte: new Date() } },
        { 'schedule.endDate': null }
      ],
      'budget.spent': { $lt: '$budget.amount' }
    }).limit(3);
    
    // Filter ads based on targeting
    const targetedAds = ads.filter(ad => {
      if (ad.targeting.ageRange) {
        const userAge = calculateAge(user.dateOfBirth);
        if (userAge < ad.targeting.ageRange.min || userAge > ad.targeting.ageRange.max) {
          return false;
        }
      }
      
      if (ad.targeting.gender && ad.targeting.gender !== 'all' && user.gender !== ad.targeting.gender) {
        return false;
      }
      
      return true;
    });
    
    // Inject ads every 5 posts
    const feedWithAds = [];
    let adIndex = 0;
    
    posts.forEach((post, index) => {
      feedWithAds.push(post);
      
      if ((index + 1) % 5 === 0 && adIndex < targetedAds.length) {
        feedWithAds.push({
          ...targetedAds[adIndex].toObject(),
          type: 'ad',
          id: `ad_${targetedAds[adIndex]._id}`
        });
        adIndex++;
      }
    });
    
    return feedWithAds;
  } catch (error) {
    console.error('Error injecting ads:', error);
    return posts;
  }
};

// Extract user interests from posts
const extractInterests = (userPosts, likedPosts) => {
  const interests = new Set();
  
  [...userPosts, ...likedPosts].forEach(post => {
    if (post.tags) {
      post.tags.forEach(tag => interests.add(tag));
    }
    
    // Extract keywords from content
    const words = post.content.toLowerCase().match(/\b\w+\b/g) || [];
    words.forEach(word => {
      if (word.length > 3) interests.add(word);
    });
  });
  
  return Array.from(interests).slice(0, 20);
};

// Calculate age from date of birth
const calculateAge = (dateOfBirth) => {
  if (!dateOfBirth) return 25; // Default age
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
};

module.exports = router;