const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const SystemMetrics = require('../models/SystemMetrics');
const ErrorLog = require('../models/ErrorLog');
const monitoringService = require('../services/monitoringService');
const mongoose = require('mongoose');

router.get('/health', async (req, res) => {
  try {
    const health = await monitoringService.getHealthStatus();
    
    const statusCode = health.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(health);
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message
    });
  }
});

router.get('/health/liveness', async (req, res) => {
  res.json({ status: 'alive', timestamp: new Date() });
});

router.get('/health/readiness', async (req, res) => {
  try {
    const dbReady = mongoose.connection.readyState === 1;

    if (dbReady) {
      res.json({ status: 'ready', timestamp: new Date() });
    } else {
      res.status(503).json({ status: 'not_ready', reason: 'Database not connected' });
    }
  } catch (error) {
    res.status(503).json({ status: 'not_ready', error: error.message });
  }
});

router.get('/metrics', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { metricType, name, startDate, endDate, aggregation = 'avg' } = req.query;

    const query = {};
    if (metricType) query.metricType = metricType;
    if (name) query.name = name;

    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    const metrics = await SystemMetrics.find(query)
      .sort({ timestamp: -1 })
      .limit(1000);

    const aggregated = {};
    metrics.forEach(metric => {
      const key = `${metric.metricType}:${metric.name}`;
      if (!aggregated[key]) {
        aggregated[key] = {
          metricType: metric.metricType,
          name: metric.name,
          values: [],
          unit: metric.unit
        };
      }
      aggregated[key].values.push(metric.value);
    });

    Object.keys(aggregated).forEach(key => {
      const values = aggregated[key].values;
      const sum = values.reduce((a, b) => a + b, 0);
      
      aggregated[key].statistics = {
        count: values.length,
        sum,
        avg: sum / values.length,
        min: Math.min(...values),
        max: Math.max(...values)
      };
      
      delete aggregated[key].values;
    });

    res.json({
      metrics: Object.values(aggregated),
      timeRange: {
        start: metrics[metrics.length - 1]?.timestamp,
        end: metrics[0]?.timestamp
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/system-metrics', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const systemMetrics = monitoringService.getSystemMetrics();
    res.json(systemMetrics);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/errors', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'moderator') {
      return res.status(403).json({ error: 'Admin or moderator access required' });
    }

    const {
      page = 1,
      limit = 50,
      severity,
      type,
      resolved
    } = req.query;

    const query = {};
    if (severity) query.severity = severity;
    if (type) query.type = type;
    if (resolved !== undefined) query.resolved = resolved === 'true';

    const errors = await ErrorLog.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await ErrorLog.countDocuments(query);

    res.json({
      errors,
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

router.get('/errors/:errorId', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'moderator') {
      return res.status(403).json({ error: 'Admin or moderator access required' });
    }

    const error = await ErrorLog.findOne({ errorId: req.params.errorId });

    if (!error) {
      return res.status(404).json({ error: 'Error not found' });
    }

    res.json(error);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/errors/:errorId/resolve', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'moderator') {
      return res.status(403).json({ error: 'Admin or moderator access required' });
    }

    const error = await ErrorLog.findOneAndUpdate(
      { errorId: req.params.errorId },
      {
        $set: {
          resolved: true,
          resolvedAt: new Date(),
          resolvedBy: req.user.id
        }
      },
      { new: true }
    );

    if (!error) {
      return res.status(404).json({ error: 'Error not found' });
    }

    res.json(error);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/uptime', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const uptime = {
      processUptime: process.uptime(),
      systemUptime: require('os').uptime(),
      startTime: new Date(Date.now() - process.uptime() * 1000),
      currentTime: new Date()
    };

    res.json(uptime);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/metrics/record', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { name, value, metricType, unit, tags } = req.body;

    monitoringService.recordMetric(name, value, metricType, unit, tags);

    res.json({ message: 'Metric recorded' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/dashboard/stats', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const User = require('../models/User');
    const Post = require('../models/Post');
    const Message = require('../models/Message');

    const [
      totalUsers,
      totalPosts,
      totalMessages,
      recentErrors,
      systemMetrics
    ] = await Promise.all([
      User.countDocuments(),
      Post.countDocuments(),
      Message.countDocuments(),
      ErrorLog.countDocuments({ resolved: false }),
      Promise.resolve(monitoringService.getSystemMetrics())
    ]);

    const onlineUsers = await require('../config/redis').get('online_users_count') || 0;

    res.json({
      users: {
        total: totalUsers,
        online: parseInt(onlineUsers)
      },
      content: {
        posts: totalPosts,
        messages: totalMessages
      },
      system: systemMetrics,
      errors: {
        unresolved: recentErrors
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
