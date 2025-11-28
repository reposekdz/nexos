const express = require('express');
const {
  SystemMetric,
  UserEngagement,
  ErrorLog,
  AlertRule,
  AlertHistory,
  Dashboard,
  ReportSchedule,
  ReportExecution,
  PerformanceMetric,
  ResourceUsage,
  AnomalyDetection,
  UsageHeatmap,
  ServiceHealth
} = require('../models/Analytics');
const auth = require('../middleware/auth');
const router = express.Router();

router.post('/metrics', auth, async (req, res) => {
  try {
    const metric = new SystemMetric(req.body);
    await metric.save();
    res.status(201).json(metric);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/metrics', auth, async (req, res) => {
  try {
    const { metricType, service, from, to, aggregation } = req.query;
    const filter = {};
    
    if (metricType) filter.metricType = metricType;
    if (service) filter.service = service;
    if (from || to) {
      filter.timestamp = {};
      if (from) filter.timestamp.$gte = new Date(from);
      if (to) filter.timestamp.$lte = new Date(to);
    }
    
    let query = SystemMetric.find(filter).sort({ timestamp: -1 });
    
    if (aggregation) {
      const result = await SystemMetric.aggregate([
        { $match: filter },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d %H:00:00", date: "$timestamp" } },
            avg: { $avg: '$value' },
            min: { $min: '$value' },
            max: { $max: '$value' },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: -1 } }
      ]);
      
      return res.json(result);
    }
    
    const metrics = await query.limit(1000);
    res.json(metrics);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/engagement', async (req, res) => {
  try {
    const engagement = new UserEngagement(req.body);
    await engagement.save();
    res.status(201).json({ success: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/engagement', auth, async (req, res) => {
  try {
    const { userId, event, from, to } = req.query;
    const filter = {};
    
    if (userId) filter.userId = userId;
    if (event) filter.event = event;
    if (from || to) {
      filter.timestamp = {};
      if (from) filter.timestamp.$gte = new Date(from);
      if (to) filter.timestamp.$lte = new Date(to);
    }
    
    const engagement = await UserEngagement.find(filter)
      .sort({ timestamp: -1 })
      .limit(1000);
    
    res.json(engagement);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/engagement/stats', auth, async (req, res) => {
  try {
    const { from, to } = req.query;
    const filter = {};
    
    if (from || to) {
      filter.timestamp = {};
      if (from) filter.timestamp.$gte = new Date(from);
      if (to) filter.timestamp.$lte = new Date(to);
    }
    
    const stats = await UserEngagement.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$event',
          count: { $sum: 1 },
          uniqueUsers: { $addToSet: '$userId' },
          avgDuration: { $avg: '$duration' }
        }
      },
      {
        $project: {
          event: '$_id',
          count: 1,
          uniqueUsers: { $size: '$uniqueUsers' },
          avgDuration: 1
        }
      },
      { $sort: { count: -1 } }
    ]);
    
    res.json(stats);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/errors', async (req, res) => {
  try {
    const { message, stack, service, fingerprint } = req.body;
    
    let errorLog = null;
    
    if (fingerprint) {
      errorLog = await ErrorLog.findOne({ fingerprint, resolved: false });
    }
    
    if (errorLog) {
      errorLog.occurrences += 1;
      errorLog.lastOccurrence = new Date();
      await errorLog.save();
    } else {
      errorLog = new ErrorLog(req.body);
      await errorLog.save();
    }
    
    res.status(201).json(errorLog);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/errors', auth, async (req, res) => {
  try {
    const { level, service, resolved } = req.query;
    const filter = {};
    
    if (level) filter.level = level;
    if (service) filter.service = service;
    if (resolved !== undefined) filter.resolved = resolved === 'true';
    
    const errors = await ErrorLog.find(filter)
      .sort({ lastOccurrence: -1 })
      .limit(100);
    
    res.json(errors);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/errors/:id/resolve', auth, async (req, res) => {
  try {
    const errorLog = await ErrorLog.findByIdAndUpdate(
      req.params.id,
      {
        resolved: true,
        resolvedAt: new Date(),
        resolvedBy: req.userId
      },
      { new: true }
    );
    
    if (!errorLog) {
      return res.status(404).json({ message: 'Error log not found' });
    }
    
    res.json(errorLog);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/alerts/rules', auth, async (req, res) => {
  try {
    const rule = new AlertRule(req.body);
    await rule.save();
    res.status(201).json(rule);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/alerts/rules', auth, async (req, res) => {
  try {
    const rules = await AlertRule.find().sort({ createdAt: -1 });
    res.json(rules);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/alerts/rules/:id', auth, async (req, res) => {
  try {
    const rule = await AlertRule.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    
    if (!rule) {
      return res.status(404).json({ message: 'Alert rule not found' });
    }
    
    res.json(rule);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.delete('/alerts/rules/:id', auth, async (req, res) => {
  try {
    await AlertRule.findByIdAndDelete(req.params.id);
    res.json({ message: 'Alert rule deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/alerts/history', auth, async (req, res) => {
  try {
    const { rule, severity, resolved } = req.query;
    const filter = {};
    
    if (rule) filter.rule = rule;
    if (severity) filter.severity = severity;
    if (resolved !== undefined) filter.resolved = resolved === 'true';
    
    const history = await AlertHistory.find(filter)
      .populate('rule', 'name description')
      .sort({ triggeredAt: -1 })
      .limit(100);
    
    res.json(history);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/dashboards', auth, async (req, res) => {
  try {
    const dashboard = new Dashboard({
      ...req.body,
      owner: req.userId
    });
    await dashboard.save();
    res.status(201).json(dashboard);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/dashboards', auth, async (req, res) => {
  try {
    const dashboards = await Dashboard.find({
      $or: [
        { owner: req.userId },
        { sharedWith: req.userId },
        { visibility: 'public' }
      ]
    }).populate('owner', 'username email');
    
    res.json(dashboards);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/dashboards/:id', auth, async (req, res) => {
  try {
    const dashboard = await Dashboard.findById(req.params.id)
      .populate('owner', 'username email');
    
    if (!dashboard) {
      return res.status(404).json({ message: 'Dashboard not found' });
    }
    
    res.json(dashboard);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/dashboards/:id', auth, async (req, res) => {
  try {
    const dashboard = await Dashboard.findOneAndUpdate(
      { _id: req.params.id, owner: req.userId },
      req.body,
      { new: true }
    );
    
    if (!dashboard) {
      return res.status(404).json({ message: 'Dashboard not found or access denied' });
    }
    
    res.json(dashboard);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/reports/schedules', auth, async (req, res) => {
  try {
    const schedule = new ReportSchedule({
      ...req.body,
      createdBy: req.userId
    });
    await schedule.save();
    res.status(201).json(schedule);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/reports/schedules', auth, async (req, res) => {
  try {
    const schedules = await ReportSchedule.find({ createdBy: req.userId })
      .sort({ createdAt: -1 });
    
    res.json(schedules);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/reports/executions', auth, async (req, res) => {
  try {
    const { schedule } = req.query;
    const filter = {};
    
    if (schedule) filter.schedule = schedule;
    
    const executions = await ReportExecution.find(filter)
      .populate('schedule', 'name reportType')
      .sort({ createdAt: -1 })
      .limit(50);
    
    res.json(executions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/performance', async (req, res) => {
  try {
    const metric = new PerformanceMetric(req.body);
    await metric.save();
    res.status(201).json({ success: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/performance', auth, async (req, res) => {
  try {
    const { endpoint, from, to } = req.query;
    const filter = {};
    
    if (endpoint) filter.endpoint = endpoint;
    if (from || to) {
      filter.timestamp = {};
      if (from) filter.timestamp.$gte = new Date(from);
      if (to) filter.timestamp.$lte = new Date(to);
    }
    
    const stats = await PerformanceMetric.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$endpoint',
          avgDuration: { $avg: '$duration' },
          minDuration: { $min: '$duration' },
          maxDuration: { $max: '$duration' },
          count: { $sum: 1 },
          errors: { $sum: { $cond: [{ $gte: ['$statusCode', 400] }, 1, 0] } }
        }
      },
      { $sort: { avgDuration: -1 } }
    ]);
    
    res.json(stats);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/resources', auth, async (req, res) => {
  try {
    const usage = new ResourceUsage(req.body);
    await usage.save();
    res.status(201).json({ success: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/resources', auth, async (req, res) => {
  try {
    const { resource, service } = req.query;
    const filter = {};
    
    if (resource) filter.resource = resource;
    if (service) filter.service = service;
    
    const usage = await ResourceUsage.find(filter)
      .sort({ timestamp: -1 })
      .limit(100);
    
    res.json(usage);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/anomalies', auth, async (req, res) => {
  try {
    const { metric, resolved, severity } = req.query;
    const filter = {};
    
    if (metric) filter.metric = metric;
    if (resolved !== undefined) filter.resolved = resolved === 'true';
    if (severity) filter.severity = severity;
    
    const anomalies = await AnomalyDetection.find(filter)
      .sort({ detectedAt: -1 })
      .limit(100);
    
    res.json(anomalies);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/anomalies/:id/resolve', auth, async (req, res) => {
  try {
    const anomaly = await AnomalyDetection.findByIdAndUpdate(
      req.params.id,
      {
        resolved: true,
        resolvedAt: new Date()
      },
      { new: true }
    );
    
    if (!anomaly) {
      return res.status(404).json({ message: 'Anomaly not found' });
    }
    
    res.json(anomaly);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/heatmap', auth, async (req, res) => {
  try {
    const { feature, from, to } = req.query;
    const filter = {};
    
    if (feature) filter.feature = feature;
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = new Date(from);
      if (to) filter.date.$lte = new Date(to);
    }
    
    const heatmap = await UsageHeatmap.find(filter)
      .sort({ date: -1, hour: -1 });
    
    res.json(heatmap);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/health', async (req, res) => {
  try {
    const services = await ServiceHealth.find()
      .sort({ lastCheck: -1 });
    
    res.json(services);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/health/:service', auth, async (req, res) => {
  try {
    const health = await ServiceHealth.findOneAndUpdate(
      { service: req.params.service },
      {
        ...req.body,
        service: req.params.service,
        lastCheck: new Date()
      },
      { upsert: true, new: true }
    );
    
    res.json(health);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
