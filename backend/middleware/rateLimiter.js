const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const redis = require('../config/redis');
const User = require('../models/User');
const logger = require('../utils/logger');

const createLimiter = (options = {}) => {
  const {
    windowMs = 15 * 60 * 1000,
    max = 100,
    message = 'Too many requests, please try again later',
    skipSuccessfulRequests = false,
    skipFailedRequests = false
  } = options;

  return rateLimit({
    store: new RedisStore({
      client: redis,
      prefix: 'rl:'
    }),
    windowMs,
    max,
    message,
    skipSuccessfulRequests,
    skipFailedRequests,
    handler: (req, res) => {
      logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
      res.status(429).json({
        error: message,
        retryAfter: res.getHeader('Retry-After')
      });
    }
  });
};

const authLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many login attempts, please try again after 15 minutes',
  skipSuccessfulRequests: true
});

const postLimiter = createLimiter({
  windowMs: 60 * 60 * 1000,
  max: 50,
  message: 'Too many posts created, please try again later'
});

const messageLimiter = createLimiter({
  windowMs: 60 * 1000,
  max: 30,
  message: 'Too many messages sent, please slow down'
});

const commentLimiter = createLimiter({
  windowMs: 60 * 1000,
  max: 20,
  message: 'Too many comments, please try again later'
});

const followLimiter = createLimiter({
  windowMs: 60 * 60 * 1000,
  max: 100,
  message: 'Too many follow/unfollow actions, please try again later'
});

const apiLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many API requests, please try again later'
});

const strictLimiter = createLimiter({
  windowMs: 60 * 1000,
  max: 10,
  message: 'Rate limit exceeded, please try again in a minute'
});

const adaptiveRateLimiter = async (req, res, next) => {
  try {
    if (!req.user) return next();

    const user = await User.findById(req.user.id);
    if (!user) return next();

    let maxRequests = 100;

    if (user.isVerified) {
      maxRequests = 200;
    }

    if (user.role === 'admin' || user.role === 'moderator') {
      return next();
    }

    const key = `adaptive:${req.user.id}`;
    const requests = await redis.incr(key);

    if (requests === 1) {
      await redis.expire(key, 60);
    }

    if (requests > maxRequests) {
      logger.warn(`Adaptive rate limit exceeded for user: ${req.user.id}`);
      return res.status(429).json({
        error: 'Too many requests, please try again later'
      });
    }

    next();
  } catch (error) {
    logger.error('Adaptive rate limiter error:', error);
    next();
  }
};

module.exports = {
  createLimiter,
  authLimiter,
  postLimiter,
  messageLimiter,
  commentLimiter,
  followLimiter,
  apiLimiter,
  strictLimiter,
  adaptiveRateLimiter
};
