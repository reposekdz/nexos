const express = require('express');
const APIStatus = require('../models/APIStatus');
const Incident = require('../models/Incident');
const IncidentTimeline = require('../models/IncidentTimeline');
const auth = require('../middleware/auth');
const { adminOnly } = require('../middleware/roleCheck');
const logger = require('../utils/logger');
const crypto = require('crypto');
const router = express.Router();

router.get('/api-status/public', async (req, res) => {
  try {
    const { region } = req.query;

    const query = {};
    if (region) query.region = region;

    const components = await APIStatus.find(query)
      .select('component status region metrics lastChecked statusChangedAt')
      .sort({ component: 1 });

    const activeIncidents = await Incident.find({
      status: { $in: ['investigating', 'identified', 'monitoring'] }
    })
      .select('incidentId title severity status affectedComponents detectedAt')
      .sort({ detectedAt: -1 })
      .limit(5);

    const overallStatus = components.some(c => c.status === 'major_outage') ? 'major_outage' :
                          components.some(c => c.status === 'partial_outage') ? 'partial_outage' :
                          components.some(c => c.status === 'degraded') ? 'degraded' :
                          'operational';

    res.json({
      overallStatus,
      components,
      activeIncidents,
      lastUpdated: new Date()
    });
  } catch (error) {
    logger.error('Get API status error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/api-status/component/:component', async (req, res) => {
  try {
    const status = await APIStatus.findOne({
      component: req.params.component
    });

    if (!status) {
      return res.status(404).json({ error: 'Component not found' });
    }

    const recentIncidents = await Incident.find({
      affectedComponents: req.params.component,
      detectedAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
    })
      .sort({ detectedAt: -1 })
      .limit(10);

    res.json({
      status,
      recentIncidents
    });
  } catch (error) {
    logger.error('Get component status error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/api-status/update', [auth, adminOnly], async (req, res) => {
  try {
    const { component, status, region, metrics } = req.body;

    let apiStatus = await APIStatus.findOne({ component, region: region || 'global' });

    if (apiStatus) {
      const statusChanged = apiStatus.status !== status;
      apiStatus.status = status;
      apiStatus.metrics = metrics || apiStatus.metrics;
      apiStatus.lastChecked = new Date();
      
      if (statusChanged) {
        apiStatus.statusChangedAt = new Date();
      }

      await apiStatus.save();
    } else {
      apiStatus = await APIStatus.create({
        component,
        status,
        region: region || 'global',
        metrics,
        lastChecked: new Date(),
        statusChangedAt: new Date()
      });
    }

    logger.info(`API status updated: ${component}`, { status, region });

    res.json(apiStatus);
  } catch (error) {
    logger.error('Update API status error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/incidents', [auth, adminOnly], async (req, res) => {
  try {
    const {
      title,
      description,
      severity,
      affectedComponents,
      affectedRegions,
      detectionMethod,
      impact
    } = req.body;

    const incidentId = `INC-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

    const incident = await Incident.create({
      incidentId,
      title,
      description,
      severity,
      status: 'investigating',
      affectedComponents: affectedComponents || [],
      affectedRegions: affectedRegions || ['global'],
      impact,
      detectedAt: new Date(),
      detectedBy: req.user.id,
      detectionMethod: detectionMethod || 'manual',
      assignedTo: [req.user.id],
      responders: [{
        user: req.user.id,
        role: 'incident_commander',
        joinedAt: new Date()
      }]
    });

    await IncidentTimeline.create({
      incident: incident._id,
      eventType: 'detected',
      description: `Incident created: ${title}`,
      actor: req.user.id,
      automated: false,
      visibility: 'public'
    });

    for (const component of affectedComponents) {
      await APIStatus.findOneAndUpdate(
        { component },
        {
          currentIncident: incident._id,
          lastIncident: new Date()
        }
      );
    }

    if (global.io) {
      global.io.emit('incident_created', {
        incidentId: incident.incidentId,
        title: incident.title,
        severity: incident.severity
      });
    }

    logger.warn(`Incident created: ${incidentId}`, {
      severity,
      affectedComponents
    });

    res.status(201).json(incident);
  } catch (error) {
    logger.error('Create incident error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/incidents', [auth, adminOnly], async (req, res) => {
  try {
    const { status, severity, page = 1, limit = 20 } = req.query;

    const query = {};
    if (status) query.status = status;
    if (severity) query.severity = severity;

    const incidents = await Incident.find(query)
      .populate('detectedBy', 'fullName email')
      .populate('resolvedBy', 'fullName email')
      .populate('assignedTo', 'fullName email')
      .sort({ detectedAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Incident.countDocuments(query);

    const severityCounts = await Incident.aggregate([
      { $match: { status: { $ne: 'resolved' } } },
      { $group: { _id: '$severity', count: { $sum: 1 } } }
    ]);

    res.json({
      incidents,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      },
      severityCounts: severityCounts.reduce((acc, { _id, count }) => {
        acc[_id] = count;
        return acc;
      }, {})
    });
  } catch (error) {
    logger.error('Get incidents error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/incidents/:id', [auth, adminOnly], async (req, res) => {
  try {
    const incident = await Incident.findById(req.params.id)
      .populate('detectedBy', 'fullName email')
      .populate('resolvedBy', 'fullName email')
      .populate('assignedTo', 'fullName email')
      .populate('responders.user', 'fullName email');

    if (!incident) {
      return res.status(404).json({ error: 'Incident not found' });
    }

    const timeline = await IncidentTimeline.find({ incident: incident._id })
      .populate('actor', 'fullName email')
      .sort({ createdAt: 1 });

    res.json({
      incident,
      timeline
    });
  } catch (error) {
    logger.error('Get incident error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/incidents/:id/update-status', [auth, adminOnly], async (req, res) => {
  try {
    const { status, description } = req.body;

    const incident = await Incident.findById(req.params.id);
    if (!incident) {
      return res.status(404).json({ error: 'Incident not found' });
    }

    const previousStatus = incident.status;
    incident.status = status;

    if (status === 'resolved') {
      incident.resolvedAt = new Date();
      incident.resolvedBy = req.user.id;
      incident.resolutionTime = incident.resolvedAt - incident.detectedAt;

      for (const component of incident.affectedComponents) {
        await APIStatus.findOneAndUpdate(
          { component },
          { $unset: { currentIncident: 1 } }
        );
      }
    }

    await incident.save();

    await IncidentTimeline.create({
      incident: incident._id,
      eventType: 'status_change',
      description: description || `Status changed from ${previousStatus} to ${status}`,
      actor: req.user.id,
      automated: false,
      visibility: 'public'
    });

    if (global.io) {
      global.io.emit('incident_updated', {
        incidentId: incident.incidentId,
        status: incident.status
      });
    }

    logger.info(`Incident status updated: ${incident.incidentId}`, {
      previousStatus,
      newStatus: status
    });

    res.json(incident);
  } catch (error) {
    logger.error('Update incident status error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/incidents/:id/timeline', [auth, adminOnly], async (req, res) => {
  try {
    const { eventType, description, visibility, attachments, metrics } = req.body;

    const incident = await Incident.findById(req.params.id);
    if (!incident) {
      return res.status(404).json({ error: 'Incident not found' });
    }

    const timelineEvent = await IncidentTimeline.create({
      incident: incident._id,
      eventType,
      description,
      actor: req.user.id,
      automated: false,
      visibility: visibility || 'internal',
      attachments: attachments || [],
      metrics
    });

    logger.info(`Timeline event added to incident: ${incident.incidentId}`, {
      eventType
    });

    res.status(201).json(timelineEvent);
  } catch (error) {
    logger.error('Add timeline event error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/incidents/:id/timeline', async (req, res) => {
  try {
    const { visibility = 'public' } = req.query;

    const query = { incident: req.params.id };
    if (visibility === 'public' && !req.user?.isAdmin) {
      query.visibility = 'public';
    }

    const timeline = await IncidentTimeline.find(query)
      .populate('actor', 'fullName email')
      .sort({ createdAt: 1 });

    res.json(timeline);
  } catch (error) {
    logger.error('Get incident timeline error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/incidents/stats/summary', [auth, adminOnly], async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const dateQuery = {};
    if (startDate && endDate) {
      dateQuery.detectedAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const totalIncidents = await Incident.countDocuments(dateQuery);
    const activeIncidents = await Incident.countDocuments({
      ...dateQuery,
      status: { $in: ['investigating', 'identified', 'monitoring'] }
    });
    const resolvedIncidents = await Incident.countDocuments({
      ...dateQuery,
      status: 'resolved'
    });

    const avgResolutionTime = await Incident.aggregate([
      { $match: { ...dateQuery, status: 'resolved', resolutionTime: { $exists: true } } },
      { $group: { _id: null, avgTime: { $avg: '$resolutionTime' } } }
    ]);

    const incidentsBySeverity = await Incident.aggregate([
      { $match: dateQuery },
      { $group: { _id: '$severity', count: { $sum: 1 } } }
    ]);

    const slaBreaches = await Incident.countDocuments({
      ...dateQuery,
      slaBreached: true
    });

    res.json({
      summary: {
        total: totalIncidents,
        active: activeIncidents,
        resolved: resolvedIncidents,
        slaBreaches
      },
      avgResolutionTime: avgResolutionTime[0]?.avgTime || 0,
      bySeverity: incidentsBySeverity.reduce((acc, { _id, count }) => {
        acc[_id] = count;
        return acc;
      }, {})
    });
  } catch (error) {
    logger.error('Get incident stats error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;