const express = require('express');
const User = require('../models/User');
const Post = require('../models/Post');
const Ad = require('../models/Ad');
const auth = require('../middleware/auth');
const router = express.Router();

// User analytics dashboard
router.get('/user', auth, async (req, res) => {
  try {
    const { timeframe = '30d' } = req.query;
    const user = await User.findById(req.userId);
    
    let dateFilter = new Date();
    switch (timeframe) {
      case '7d':
        dateFilter.setDate(dateFilter.getDate() - 7);
        break;
      case '30d':
        dateFilter.setDate(dateFilter.getDate() - 30);
        break;
      case '90d':
        dateFilter.setDate(dateFilter.getDate() - 90);
        break;
      default:
        dateFilter.setDate(dateFilter.getDate() - 30);
    }
    
    // Get user's posts analytics
    const posts = await Post.find({
      author: req.userId,
      createdAt: { $gte: dateFilter }
    });
    
    // Calculate metrics
    const totalPosts = posts.length;
    const totalLikes = posts.reduce((sum, post) => sum + post.likes.length, 0);
    const totalComments = posts.reduce((sum, post) => sum + post.comments.length, 0);
    const totalShares = posts.reduce((sum, post) => sum + post.shares.length, 0);
    const totalEngagement = totalLikes + totalComments + totalShares;
    
    // Engagement rate
    const engagementRate = totalPosts > 0 ? (totalEngagement / totalPosts).toFixed(2) : 0;
    
    // Top performing posts
    const topPosts = posts
      .map(post => ({
        id: post._id,
        content: post.content.substring(0, 100),
        likes: post.likes.length,
        comments: post.comments.length,
        shares: post.shares.length,
        engagement: post.likes.length + post.comments.length + post.shares.length,
        createdAt: post.createdAt
      }))
      .sort((a, b) => b.engagement - a.engagement)
      .slice(0, 5);
    
    // Follower growth
    const followerGrowth = await calculateFollowerGrowth(req.userId, dateFilter);
    
    // Engagement by day
    const engagementByDay = await calculateEngagementByDay(posts);
    
    res.json({
      overview: {
        totalPosts,
        totalLikes,
        totalComments,
        totalShares,
        totalEngagement,
        engagementRate,
        followers: user.followers.length,
        following: user.following.length
      },
      topPosts,
      followerGrowth,
      engagementByDay,
      demographics: await getUserDemographics(req.userId)
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Post analytics
router.get('/post/:id', auth, async (req, res) => {
  try {
    const post = await Post.findOne({
      _id: req.params.id,
      author: req.userId
    }).populate('likes', 'username fullName avatar')
      .populate('comments.user', 'username fullName avatar');
    
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }
    
    // Calculate reach (unique users who saw the post)
    const reach = await calculatePostReach(post._id);
    
    // Engagement breakdown
    const engagement = {
      likes: post.likes.length,
      comments: post.comments.length,
      shares: post.shares.length,
      total: post.likes.length + post.comments.length + post.shares.length
    };
    
    // Engagement rate
    const engagementRate = reach > 0 ? ((engagement.total / reach) * 100).toFixed(2) : 0;
    
    // Top comments
    const topComments = post.comments
      .sort((a, b) => b.likes.length - a.likes.length)
      .slice(0, 5);
    
    res.json({
      post: {
        id: post._id,
        content: post.content,
        createdAt: post.createdAt,
        media: post.media
      },
      metrics: {
        reach,
        engagement,
        engagementRate,
        impressions: reach * 1.5 // Estimated impressions
      },
      topComments,
      likesByHour: await getLikesByHour(post._id),
      demographics: await getPostDemographics(post._id)
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Ad analytics (for advertisers)
router.get('/ads', auth, async (req, res) => {
  try {
    const ads = await Ad.find({ advertiser: req.userId });
    
    const analytics = await Promise.all(ads.map(async (ad) => {
      const ctr = ad.metrics.impressions > 0 ? 
        ((ad.metrics.clicks / ad.metrics.impressions) * 100).toFixed(2) : 0;
      
      const cpc = ad.metrics.clicks > 0 ? 
        (ad.budget.spent / ad.metrics.clicks).toFixed(2) : 0;
      
      const cpm = ad.metrics.impressions > 0 ? 
        ((ad.budget.spent / ad.metrics.impressions) * 1000).toFixed(2) : 0;
      
      return {
        id: ad._id,
        title: ad.title,
        status: ad.status,
        budget: ad.budget,
        metrics: {
          ...ad.metrics,
          ctr: parseFloat(ctr),
          cpc: parseFloat(cpc),
          cpm: parseFloat(cpm)
        },
        performance: calculateAdPerformance(ad)
      };
    }));
    
    // Overall campaign metrics
    const totalSpent = ads.reduce((sum, ad) => sum + ad.budget.spent, 0);
    const totalImpressions = ads.reduce((sum, ad) => sum + ad.metrics.impressions, 0);
    const totalClicks = ads.reduce((sum, ad) => sum + ad.metrics.clicks, 0);
    const overallCTR = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : 0;
    
    res.json({
      ads: analytics,
      overview: {
        totalAds: ads.length,
        totalSpent,
        totalImpressions,
        totalClicks,
        overallCTR: parseFloat(overallCTR),
        activeAds: ads.filter(ad => ad.status === 'active').length
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Platform analytics (admin only)
router.get('/platform', auth, async (req, res) => {
  try {
    // Check if user is admin
    const user = await User.findById(req.userId);
    if (user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    const { timeframe = '30d' } = req.query;
    let dateFilter = new Date();
    dateFilter.setDate(dateFilter.getDate() - parseInt(timeframe.replace('d', '')));
    
    // User metrics
    const totalUsers = await User.countDocuments();
    const newUsers = await User.countDocuments({ createdAt: { $gte: dateFilter } });
    const activeUsers = await User.countDocuments({ lastSeen: { $gte: dateFilter } });
    
    // Content metrics
    const totalPosts = await Post.countDocuments();
    const newPosts = await Post.countDocuments({ createdAt: { $gte: dateFilter } });
    
    // Engagement metrics
    const totalEngagement = await Post.aggregate([
      { $match: { createdAt: { $gte: dateFilter } } },
      {
        $group: {
          _id: null,
          totalLikes: { $sum: { $size: '$likes' } },
          totalComments: { $sum: { $size: '$comments' } },
          totalShares: { $sum: { $size: '$shares' } }
        }
      }
    ]);
    
    // Revenue metrics (from ads)
    const adRevenue = await Ad.aggregate([
      { $match: { createdAt: { $gte: dateFilter } } },
      { $group: { _id: null, totalRevenue: { $sum: '$budget.spent' } } }
    ]);
    
    // Growth trends
    const userGrowth = await calculatePlatformGrowth('users', dateFilter);
    const postGrowth = await calculatePlatformGrowth('posts', dateFilter);
    
    res.json({
      users: {
        total: totalUsers,
        new: newUsers,
        active: activeUsers,
        growth: userGrowth
      },
      content: {
        totalPosts,
        newPosts,
        growth: postGrowth
      },
      engagement: totalEngagement[0] || { totalLikes: 0, totalComments: 0, totalShares: 0 },
      revenue: {
        total: adRevenue[0]?.totalRevenue || 0,
        trend: await calculateRevenueGrowth(dateFilter)
      },
      topContent: await getTopContent(dateFilter),
      demographics: await getPlatformDemographics()
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Helper functions
const calculateFollowerGrowth = async (userId, dateFilter) => {
  // This would require storing follower history
  // For now, return mock data
  return Array.from({ length: 30 }, (_, i) => ({
    date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000),
    followers: Math.floor(Math.random() * 100) + 1000
  }));
};

const calculateEngagementByDay = async (posts) => {
  const engagementByDay = {};
  
  posts.forEach(post => {
    const day = post.createdAt.toISOString().split('T')[0];
    if (!engagementByDay[day]) {
      engagementByDay[day] = 0;
    }
    engagementByDay[day] += post.likes.length + post.comments.length + post.shares.length;
  });
  
  return Object.entries(engagementByDay).map(([date, engagement]) => ({
    date,
    engagement
  }));
};

const calculatePostReach = async (postId) => {
  // This would require tracking post views
  // For now, return estimated reach
  return Math.floor(Math.random() * 1000) + 500;
};

const getUserDemographics = async (userId) => {
  // This would analyze follower demographics
  return {
    ageGroups: {
      '18-24': 25,
      '25-34': 35,
      '35-44': 20,
      '45-54': 15,
      '55+': 5
    },
    gender: {
      male: 45,
      female: 50,
      other: 5
    },
    topLocations: ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix']
  };
};

const calculateAdPerformance = (ad) => {
  const ctr = ad.metrics.impressions > 0 ? 
    (ad.metrics.clicks / ad.metrics.impressions) * 100 : 0;
  
  if (ctr > 2) return 'excellent';
  if (ctr > 1) return 'good';
  if (ctr > 0.5) return 'average';
  return 'poor';
};

module.exports = router;