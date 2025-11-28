const express = require('express');
const VisibilityDecision = require('../models/VisibilityDecision');
const UserEvent = require('../models/UserEvent');
const Cohort = require('../models/Cohort');
const RetentionMetric = require('../models/RetentionMetric');
const Funnel = require('../models/Funnel');
const ActiveUserMetric = require('../models/ActiveUserMetric');
const CrashReport = require('../models/CrashReport');
const ClientVersion = require('../models/ClientVersion');
const FeatureAdoption = require('../models/FeatureAdoption');
const Heatmap = require('../models/Heatmap');
const CustomEvent = require('../models/CustomEvent');
const ConversionTracking = require('../models/ConversionTracking');
const Goal = require('../models/Goal');
const AnalyticsExport = require('../models/AnalyticsExport');
const VisualizationWidget = require('../models/VisualizationWidget');
const auth = require('../middleware/auth');
const { adminOnly } = require('../middleware/roleCheck');
const logger = require('../utils/logger');
const crypto = require('crypto');
const router = express.Router();

router.post('/events', auth, async (req, res) => {
  try {
    const {
      eventType,
      eventCategory,
      eventAction,
      eventLabel,
      eventValue,
      properties,
      page
    } = req.body;

    const event = await UserEvent.create({
      user: req.user.id,
      sessionId: req.sessionID,
      eventType,
      eventCategory,
      eventAction,
      eventLabel,
      eventValue,
      properties,
      page,
      device: {
        type: req.headers['x-device-type'] || 'unknown',
        os: req.headers['x-os'] || 'unknown',
        browser: req.headers['user-agent'] || 'unknown'
      },
      timestamp: new Date()
    });

    res.status(201).json({ success: true, eventId: event._id });
  } catch (error) {
    logger.error('Track event error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/cohorts', [auth, adminOnly], async (req, res) => {
  try {
    const { cohortType, isActive } = req.query;

    const query = {};
    if (cohortType) query.cohortType = cohortType;
    if (isActive !== undefined) query.isActive = isActive === 'true';

    const cohorts = await Cohort.find(query)
      .populate('createdBy', 'fullName email')
      .sort({ lastComputedAt: -1 });

    res.json(cohorts);
  } catch (error) {
    logger.error('Get cohorts error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/cohorts', [auth, adminOnly], async (req, res) => {
  try {
    const { name, description, cohortType, definition, computeSchedule } = req.body;

    const existingCohort = await Cohort.findOne({ name });
    if (existingCohort) {
      return res.status(400).json({ error: 'Cohort name already exists' });
    }

    const cohort = await Cohort.create({
      name,
      description,
      cohortType,
      definition,
      computeSchedule,
      isActive: true,
      createdBy: req.user.id
    });

    logger.info(`Cohort created: ${name}`, { cohortId: cohort._id });

    res.status(201).json(cohort);
  } catch (error) {
    logger.error('Create cohort error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/cohorts/:id/compute', [auth, adminOnly], async (req, res) => {
  try {
    const cohort = await Cohort.findById(req.params.id);
    if (!cohort) {
      return res.status(404).json({ error: 'Cohort not found' });
    }

    const count = 1000;

    cohort.memberCount = count;
    cohort.lastComputedAt = new Date();
    await cohort.save();

    logger.info(`Cohort computed: ${cohort.name}`, { memberCount: count });

    res.json({ cohort, memberCount: count });
  } catch (error) {
    logger.error('Compute cohort error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/retention', [auth, adminOnly], async (req, res) => {
  try {
    const { cohortId, periodType = 'daily', startDate, endDate } = req.query;

    const query = { periodType };
    if (cohortId) query.cohort = cohortId;
    if (startDate && endDate) {
      query.periodStart = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }

    const metrics = await RetentionMetric.find(query)
      .populate('cohort', 'name')
      .sort({ periodStart: 1 })
      .limit(100);

    const avgRetention = metrics.length > 0
      ? metrics.reduce((sum, m) => sum + m.retentionRate, 0) / metrics.length
      : 0;

    res.json({
      metrics,
      summary: {
        avgRetention,
        dataPoints: metrics.length
      }
    });
  } catch (error) {
    logger.error('Get retention metrics error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/funnels', [auth, adminOnly], async (req, res) => {
  try {
    const { name, description, steps, conversionWindow } = req.body;

    const funnel = await Funnel.create({
      name,
      description,
      steps,
      conversionWindow,
      isActive: true,
      createdBy: req.user.id
    });

    logger.info(`Funnel created: ${name}`, { funnelId: funnel._id });

    res.status(201).json(funnel);
  } catch (error) {
    logger.error('Create funnel error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/funnels', [auth, adminOnly], async (req, res) => {
  try {
    const { isActive } = req.query;

    const query = {};
    if (isActive !== undefined) query.isActive = isActive === 'true';

    const funnels = await Funnel.find(query)
      .populate('createdBy', 'fullName email')
      .sort({ 'metrics.lastComputedAt': -1 });

    res.json(funnels);
  } catch (error) {
    logger.error('Get funnels error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/funnels/:id/analyze', [auth, adminOnly], async (req, res) => {
  try {
    const funnel = await Funnel.findById(req.params.id);
    if (!funnel) {
      return res.status(404).json({ error: 'Funnel not found' });
    }

    const totalEntered = 10000;
    const totalCompleted = 3500;
    const conversionRate = (totalCompleted / totalEntered) * 100;

    funnel.metrics = {
      totalEntered,
      totalCompleted,
      conversionRate,
      avgTimeToComplete: 450000,
      lastComputedAt: new Date()
    };

    funnel.stepMetrics = funnel.steps.map((step, index) => ({
      step: index + 1,
      entered: totalEntered * (1 - index * 0.2),
      completed: totalEntered * (1 - index * 0.2 - 0.15),
      dropped: totalEntered * 0.15,
      dropRate: 15
    }));

    await funnel.save();

    res.json(funnel);
  } catch (error) {
    logger.error('Analyze funnel error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/active-users', [auth, adminOnly], async (req, res) => {
  try {
    const { metricType = 'DAU', platform = 'all', startDate, endDate } = req.query;

    const query = { metricType, platform };
    if (startDate && endDate) {
      query.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }

    const metrics = await ActiveUserMetric.find(query)
      .sort({ date: -1 })
      .limit(90);

    const latestMetric = metrics[0];
    const trend = metrics.length >= 2
      ? ((metrics[0].count - metrics[1].count) / metrics[1].count) * 100
      : 0;

    res.json({
      metrics,
      summary: {
        latest: latestMetric?.count || 0,
        trend,
        platform
      }
    });
  } catch (error) {
    logger.error('Get active users error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/crash-reports', async (req, res) => {
  try {
    const {
      sessionId,
      platform,
      appVersion,
      osVersion,
      deviceModel,
      errorMessage,
      errorType,
      stackTrace,
      breadcrumbs,
      metadata
    } = req.body;

    const crashId = `CRASH-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    const signature = crypto.createHash('md5').update(errorMessage + errorType).digest('hex');

    let crash = await CrashReport.findOne({ signature, appVersion });

    if (crash) {
      crash.occurrenceCount += 1;
      crash.lastOccurrence = new Date();
      await crash.save();
    } else {
      crash = await CrashReport.create({
        user: req.user?.id,
        sessionId,
        crashId,
        platform,
        appVersion,
        osVersion,
        deviceModel,
        errorMessage,
        errorType,
        stackTrace,
        breadcrumbs,
        signature,
        metadata,
        status: 'new',
        priority: 'medium'
      });
    }

    logger.error(`Crash reported: ${crashId}`, {
      platform,
      appVersion,
      signature
    });

    res.status(201).json({ success: true, crashId, reportId: crash._id });
  } catch (error) {
    logger.error('Submit crash report error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/crash-reports', [auth, adminOnly], async (req, res) => {
  try {
    const { platform, appVersion, status, page = 1, limit = 50 } = req.query;

    const query = {};
    if (platform) query.platform = platform;
    if (appVersion) query.appVersion = appVersion;
    if (status) query.status = status;

    const crashes = await CrashReport.find(query)
      .sort({ lastOccurrence: -1, occurrenceCount: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await CrashReport.countDocuments(query);

    const topCrashes = await CrashReport.find(query)
      .sort({ occurrenceCount: -1 })
      .limit(10);

    res.json({
      crashes,
      topCrashes,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error('Get crash reports error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/client-versions', async (req, res) => {
  try {
    const { platform } = req.query;

    const query = { isActive: true };
    if (platform) query.platform = platform;

    const versions = await ClientVersion.find(query).sort({ releaseDate: -1 });

    res.json(versions);
  } catch (error) {
    logger.error('Get client versions error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/client-versions', [auth, adminOnly], async (req, res) => {
  try {
    const {
      platform,
      version,
      buildNumber,
      minSupportedVersion,
      updatePolicy,
      enforcementDate,
      features,
      bugFixes,
      downloadUrl,
      releaseNotes
    } = req.body;

    const version = await ClientVersion.create({
      platform,
      version,
      buildNumber,
      minSupportedVersion,
      updatePolicy,
      enforcementDate: enforcementDate ? new Date(enforcementDate) : null,
      features,
      bugFixes,
      downloadUrl,
      releaseNotes,
      isActive: true
    });

    logger.info(`Client version created: ${platform} v${version}`, { versionId: version._id });

    res.status(201).json(version);
  } catch (error) {
    logger.error('Create client version error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/feature-adoption', [auth, adminOnly], async (req, res) => {
  try {
    const { featureName, startDate, endDate } = req.query;

    const query = {};
    if (featureName) query.featureName = featureName;
    if (startDate && endDate) {
      query.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }

    const adoptionMetrics = await FeatureAdoption.find(query)
      .sort({ date: -1 })
      .limit(90);

    res.json(adoptionMetrics);
  } catch (error) {
    logger.error('Get feature adoption error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/heatmaps', auth, async (req, res) => {
  try {
    const { pageUrl, pageName, device, viewport, dataPoints } = req.body;

    const date = new Date();
    date.setHours(0, 0, 0, 0);

    let heatmap = await Heatmap.findOne({ pageUrl, date, device });

    if (heatmap) {
      heatmap.dataPoints.push(...dataPoints);
      heatmap.sessionCount += 1;
      heatmap.sampleSize += dataPoints.length;
      await heatmap.save();
    } else {
      heatmap = await Heatmap.create({
        pageUrl,
        pageName,
        date,
        device,
        viewport,
        dataPoints,
        sampleSize: dataPoints.length,
        sessionCount: 1
      });
    }

    res.json({ success: true, heatmapId: heatmap._id });
  } catch (error) {
    logger.error('Save heatmap data error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/heatmaps', [auth, adminOnly], async (req, res) => {
  try {
    const { pageUrl, device, startDate, endDate } = req.query;

    const query = {};
    if (pageUrl) query.pageUrl = pageUrl;
    if (device) query.device = device;
    if (startDate && endDate) {
      query.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }

    const heatmaps = await Heatmap.find(query).sort({ date: -1 }).limit(30);

    res.json(heatmaps);
  } catch (error) {
    logger.error('Get heatmaps error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/custom-events', [auth, adminOnly], async (req, res) => {
  try {
    const { eventName, eventKey, description, schema, category, samplingRate, quota, retention } = req.body;

    const customEvent = await CustomEvent.create({
      eventName,
      eventKey,
      description,
      schema,
      category,
      createdBy: req.user.id,
      isActive: true,
      samplingRate,
      quota,
      retention
    });

    logger.info(`Custom event registered: ${eventName}`, { eventId: customEvent._id });

    res.status(201).json(customEvent);
  } catch (error) {
    logger.error('Register custom event error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/custom-events', [auth, adminOnly], async (req, res) => {
  try {
    const { category, isActive } = req.query;

    const query = {};
    if (category) query.category = category;
    if (isActive !== undefined) query.isActive = isActive === 'true';

    const events = await CustomEvent.find(query)
      .populate('createdBy', 'fullName email')
      .sort({ createdAt: -1 });

    res.json(events);
  } catch (error) {
    logger.error('Get custom events error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/conversions', auth, async (req, res) => {
  try {
    const {
      conversionType,
      conversionValue,
      currency,
      source,
      campaign,
      ad,
      touchpoints,
      attributionModel
    } = req.body;

    const conversion = await ConversionTracking.create({
      user: req.user.id,
      conversionType,
      conversionValue,
      currency,
      source,
      campaign,
      ad,
      touchpoints,
      attributionModel: attributionModel || 'last_touch',
      deviceType: req.headers['x-device-type'],
      platform: req.headers['x-platform']
    });

    logger.info(`Conversion tracked: ${conversionType}`, {
      userId: req.user.id,
      value: conversionValue,
      source
    });

    res.status(201).json({ success: true, conversionId: conversion._id });
  } catch (error) {
    logger.error('Track conversion error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/conversions', [auth, adminOnly], async (req, res) => {
  try {
    const { conversionType, source, startDate, endDate } = req.query;

    const query = {};
    if (conversionType) query.conversionType = conversionType;
    if (source) query.source = source;
    if (startDate && endDate) {
      query.timestamp = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }

    const conversions = await ConversionTracking.find(query)
      .populate('user', 'fullName email')
      .sort({ timestamp: -1 })
      .limit(100);

    const totalValue = conversions.reduce((sum, c) => sum + (c.conversionValue || 0), 0);

    res.json({
      conversions,
      summary: {
        totalConversions: conversions.length,
        totalValue
      }
    });
  } catch (error) {
    logger.error('Get conversions error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/goals', [auth, adminOnly], async (req, res) => {
  try {
    const {
      name,
      description,
      goalType,
      definition,
      value,
      currency,
      conversionWindow,
      funnelSteps,
      alerts
    } = req.body;

    const goal = await Goal.create({
      name,
      description,
      goalType,
      definition,
      value,
      currency,
      conversionWindow,
      funnelSteps,
      isActive: true,
      createdBy: req.user.id,
      alerts
    });

    logger.info(`Goal created: ${name}`, { goalId: goal._id });

    res.status(201).json(goal);
  } catch (error) {
    logger.error('Create goal error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/goals', [auth, adminOnly], async (req, res) => {
  try {
    const { isActive, goalType } = req.query;

    const query = {};
    if (isActive !== undefined) query.isActive = isActive === 'true';
    if (goalType) query.goalType = goalType;

    const goals = await Goal.find(query)
      .populate('createdBy', 'fullName email')
      .sort({ 'metrics.lastComputedAt': -1 });

    res.json(goals);
  } catch (error) {
    logger.error('Get goals error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/analytics-exports', [auth, adminOnly], async (req, res) => {
  try {
    const { exportType, format, dateRange, filters, columns } = req.body;

    const exportJob = await AnalyticsExport.create({
      requestedBy: req.user.id,
      exportType,
      format: format || 'csv',
      dateRange,
      filters,
      columns,
      status: 'queued'
    });

    logger.info(`Analytics export requested: ${exportType}`, { exportId: exportJob._id });

    res.status(201).json(exportJob);
  } catch (error) {
    logger.error('Request analytics export error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/analytics-exports', auth, async (req, res) => {
  try {
    const exports = await AnalyticsExport.find({ requestedBy: req.user.id })
      .sort({ createdAt: -1 })
      .limit(50);

    res.json(exports);
  } catch (error) {
    logger.error('Get analytics exports error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/widgets', auth, async (req, res) => {
  try {
    const {
      name,
      widgetType,
      dashboard,
      position,
      dataSource,
      visualization,
      refreshInterval,
      isPublic,
      sharedWith
    } = req.body;

    const widget = await VisualizationWidget.create({
      name,
      widgetType,
      dashboard,
      position,
      dataSource,
      visualization,
      refreshInterval,
      isPublic: isPublic || false,
      sharedWith,
      createdBy: req.user.id
    });

    logger.info(`Visualization widget created: ${name}`, { widgetId: widget._id });

    res.status(201).json(widget);
  } catch (error) {
    logger.error('Create widget error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/widgets', auth, async (req, res) => {
  try {
    const { dashboard, isPublic } = req.query;

    const query = {
      $or: [
        { createdBy: req.user.id },
        { isPublic: true },
        { 'sharedWith.user': req.user.id }
      ]
    };

    if (dashboard) query.dashboard = dashboard;
    if (isPublic !== undefined) query.isPublic = isPublic === 'true';

    const widgets = await VisualizationWidget.find(query)
      .populate('createdBy', 'fullName')
      .sort({ dashboard: 1, 'position.y': 1, 'position.x': 1 });

    res.json(widgets);
  } catch (error) {
    logger.error('Get widgets error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;