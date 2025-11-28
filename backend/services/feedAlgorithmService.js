const Post = require('../models/Post');
const User = require('../models/User');
const Topic = require('../models/Topic');
const TopicFollower = require('../models/TopicFollower');
const Ad = require('../models/Ad');
const redis = require('../config/redis');
const logger = require('../utils/logger');

class FeedAlgorithmService {
  constructor() {
    this.CACHE_TTL = 300;
  }

  async generateFeed(userId, options = {}) {
    const {
      page = 1,
      limit = 20,
      sortBy = 'relevance',
      filterId = null
    } = options;

    try {
      const cacheKey = `feed:${userId}:${page}:${sortBy}:${filterId}`;
      const cached = await redis.get(cacheKey);

      if (cached) {
        return JSON.parse(cached);
      }

      let posts;

      if (sortBy === 'chronological') {
        posts = await this.getChronologicalFeed(userId, page, limit, filterId);
      } else {
        posts = await this.getRankedFeed(userId, page, limit, filterId);
      }

      const postsWithAds = await this.insertSponsoredPosts(posts, userId);

      const result = {
        posts: postsWithAds,
        page,
        hasMore: posts.length === limit,
        nextCursor: posts.length > 0 ? posts[posts.length - 1]._id : null
      };

      await redis.setex(cacheKey, this.CACHE_TTL, JSON.stringify(result));

      return result;
    } catch (error) {
      logger.error('Feed generation error:', error);
      throw error;
    }
  }

  async getChronologicalFeed(userId, page, limit, filterId) {
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    let query = {
      $or: [
        { author: { $in: user.following } },
        { author: { $in: user.friends } }
      ],
      visibility: { $in: ['public', 'friends'] }
    };

    if (filterId) {
      const filter = await require('../models/SavedFeedFilter').findById(filterId);
      if (filter) {
        query = this.applyFeedFilter(query, filter.criteria);
      }
    }

    return Post.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('author', 'username fullName avatar isVerified')
      .lean();
  }

  async getRankedFeed(userId, page, limit, filterId) {
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    const followedTopics = await TopicFollower.find({ user: userId }).select('topic');
    const topicIds = followedTopics.map(f => f.topic);

    const posts = await Post.aggregate([
      {
        $match: {
          $or: [
            { author: { $in: user.following } },
            { author: { $in: user.friends } },
            { tags: { $in: topicIds.map(id => id.toString()) } }
          ],
          visibility: { $in: ['public', 'friends'] }
        }
      },
      {
        $addFields: {
          likeCount: { $size: { $ifNull: ['$likes', []] } },
          commentCount: { $size: { $ifNull: ['$comments', []] } },
          shareCount: { $size: { $ifNull: ['$shares', []] } },
          ageInHours: {
            $divide: [
              { $subtract: [new Date(), '$createdAt'] },
              3600000
            ]
          }
        }
      },
      {
        $addFields: {
          engagementScore: {
            $add: [
              { $multiply: ['$likeCount', 1] },
              { $multiply: ['$commentCount', 3] },
              { $multiply: ['$shareCount', 5] }
            ]
          },
          timeDecay: {
            $divide: [
              1,
              { $add: [1, { $divide: ['$ageInHours', 24] }] }
            ]
          }
        }
      },
      {
        $addFields: {
          finalScore: { $multiply: ['$engagementScore', '$timeDecay'] }
        }
      },
      { $sort: { finalScore: -1, createdAt: -1 } },
      { $skip: (page - 1) * limit },
      { $limit: limit }
    ]);

    return Post.populate(posts, {
      path: 'author',
      select: 'username fullName avatar isVerified'
    });
  }

  applyFeedFilter(query, criteria) {
    if (criteria.contentTypes && criteria.contentTypes.length > 0) {
      if (!criteria.contentTypes.includes('post')) {
        query['media.type'] = { $exists: true };
      }
    }

    if (criteria.mediaTypes && criteria.mediaTypes.length > 0) {
      query['media.type'] = { $in: criteria.mediaTypes };
    }

    if (criteria.verifiedOnly) {
      query.author = { ...query.author, isVerified: true };
    }

    if (criteria.minLikes) {
      query.$expr = { $gte: [{ $size: '$likes' }, criteria.minLikes] };
    }

    if (criteria.includeHashtags && criteria.includeHashtags.length > 0) {
      query.tags = { $in: criteria.includeHashtags };
    }

    if (criteria.excludeHashtags && criteria.excludeHashtags.length > 0) {
      query.tags = { $nin: criteria.excludeHashtags };
    }

    return query;
  }

  async insertSponsoredPosts(posts, userId) {
    try {
      if (posts.length < 5) return posts;

      const user = await User.findById(userId);
      
      const eligibleAds = await Ad.find({
        status: 'active',
        'targeting.countries': user.location?.country || 'ALL',
        'budget.remaining': { $gt: 0 },
        'schedule.startDate': { $lte: new Date() },
        'schedule.endDate': { $gte: new Date() }
      })
      .limit(3)
      .lean();

      if (eligibleAds.length === 0) return posts;

      const postsWithAds = [...posts];
      const insertPositions = [4, 10, 16];

      eligibleAds.forEach((ad, index) => {
        const position = insertPositions[index];
        if (position < postsWithAds.length) {
          postsWithAds.splice(position, 0, {
            ...ad,
            isSponsored: true,
            type: 'ad'
          });
        }
      });

      return postsWithAds;
    } catch (error) {
      logger.error('Ad insertion error:', error);
      return posts;
    }
  }

  async invalidateFeedCache(userId) {
    try {
      const pattern = `feed:${userId}:*`;
      const keys = await redis.keys(pattern);
      
      if (keys.length > 0) {
        await redis.del(...keys);
      }

      logger.info(`Invalidated ${keys.length} feed cache entries for user ${userId}`);
    } catch (error) {
      logger.error('Cache invalidation error:', error);
    }
  }

  async warmFeedCache(userId) {
    try {
      await this.generateFeed(userId, { page: 1, limit: 20, sortBy: 'relevance' });
      await this.generateFeed(userId, { page: 1, limit: 20, sortBy: 'chronological' });
      logger.info(`Warmed feed cache for user ${userId}`);
    } catch (error) {
      logger.error('Cache warming error:', error);
    }
  }
}

module.exports = new FeedAlgorithmService();
