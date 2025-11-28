const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');
const Experiment = require('../models/Experiment');
const ExperimentAssignment = require('../models/ExperimentAssignment');
const FeatureFlag = require('../models/FeatureFlag');
const experimentService = require('../services/experimentService');
const featureFlagService = require('../services/featureFlagService');

router.get('/experiments/active', auth, async (req, res) => {
  try {
    const experiments = await Experiment.find({ status: 'active' });
    res.json(experiments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/experiments/:key/assign', auth, async (req, res) => {
  try {
    const context = {
      platform: req.body.platform || 'web',
      userAgent: req.headers['user-agent'],
      location: req.body.location
    };

    const assignment = await experimentService.assignVariant(
      req.params.key,
      req.user.id,
      context
    );

    res.json(assignment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/experiments/:key/convert', auth, async (req, res) => {
  try {
    const { metricKey } = req.body;

    const success = await experimentService.trackConversion(
      req.params.key,
      req.user.id,
      metricKey
    );

    res.json({ success });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/experiments/:key/results', auth, async (req, res) => {
  try {
    const results = await experimentService.getExperimentResults(req.params.key);
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/admin/experiments', auth, validate(schemas.experiment), async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const experiment = await Experiment.create({
      ...req.validatedData,
      createdBy: req.user.id
    });

    res.status(201).json(experiment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/admin/experiments/:key/start', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const experiment = await experimentService.startExperiment(
      req.params.key,
      req.user.id
    );

    res.json(experiment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/admin/experiments/:key/stop', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const experiment = await experimentService.stopExperiment(
      req.params.key,
      req.user.id
    );

    res.json(experiment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/feature-flags/:key/evaluate', auth, async (req, res) => {
  try {
    const context = {
      platform: req.query.platform || 'web',
      country: req.query.country,
      ...req.query
    };

    const evaluation = await featureFlagService.evaluateFlag(
      req.params.key,
      req.user.id,
      context
    );

    res.json(evaluation);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/feature-flags', auth, async (req, res) => {
  try {
    const flags = await FeatureFlag.find({
      environment: process.env.NODE_ENV || 'development'
    });

    res.json(flags);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/admin/feature-flags', auth, validate(schemas.featureFlag), async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const flag = await FeatureFlag.create({
      ...req.validatedData,
      environment: process.env.NODE_ENV || 'development',
      createdBy: req.user.id
    });

    flag.auditLog.push({
      action: 'created',
      performedBy: req.user.id,
      timestamp: new Date()
    });

    await flag.save();

    res.status(201).json(flag);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/admin/feature-flags/:key', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const flag = await featureFlagService.updateFlag(
      req.params.key,
      req.body,
      req.user.id
    );

    res.json(flag);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/admin/feature-flags/:key/toggle', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { enabled, reason } = req.body;

    const flag = await featureFlagService.toggleFlag(
      req.params.key,
      enabled,
      req.user.id,
      reason
    );

    res.json(flag);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/admin/feature-flags/:key', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    await FeatureFlag.findOneAndDelete({ key: req.params.key });

    featureFlagService.clearCache();

    res.json({ message: 'Feature flag deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
