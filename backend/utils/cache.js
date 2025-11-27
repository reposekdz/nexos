const { redisClient } = require('../config/database');

// Cache utility functions
const cache = {
  async get(key) {
    try {
      const data = await redisClient.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  },

  async set(key, value, ttl = 3600) {
    try {
      await redisClient.setEx(key, ttl, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error('Cache set error:', error);
      return false;
    }
  },

  async del(key) {
    try {
      await redisClient.del(key);
      return true;
    } catch (error) {
      console.error('Cache delete error:', error);
      return false;
    }
  },

  async invalidatePattern(pattern) {
    try {
      const keys = await redisClient.keys(pattern);
      if (keys.length > 0) {
        await redisClient.del(keys);
      }
      return true;
    } catch (error) {
      console.error('Cache invalidate error:', error);
      return false;
    }
  },

  middleware: (duration = 300) => {
    return async (req, res, next) => {
      if (req.method !== 'GET') return next();
      
      const key = `cache:${req.originalUrl}`;
      const cached = await cache.get(key);
      
      if (cached) {
        return res.json(cached);
      }
      
      res.originalJson = res.json;
      res.json = function(data) {
        cache.set(key, data, duration);
        res.originalJson(data);
      };
      
      next();
    };
  }
};

module.exports = cache;
