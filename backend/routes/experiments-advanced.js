const express = require('express');
const crypto = require('crypto');
const {
  ExperimentConfig,
  ExperimentExposure,
  ExperimentMetric,
  AssignmentOverride,
  ExperimentArchive,
  BanditState,
  IdentityMergeLog,
  FeatureFlag
} = require('../models/Experiment');
const auth = require('../middleware/auth');
const router = express.Router();

// Create experiment
router.post('/', auth, async (req, res) => {
  try {
    const experiment = new ExperimentConfig({
      ...req.body,
      creator: req.userId,
      randomSeed: crypto.randomBytes(32).toString('hex')
    });
    await experiment.save();
    res.status(201).json(experiment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all experiments
router.get('/', auth, async (req, res) => {
  try {
    const { status, feature } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (feature) filter.feature = feature;

    const experiments = await ExperimentConfig.find(filter)
      .populate('creator', 'username email')
      .sort({ createdAt: -1 });
    
    res.json(experiments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get experiment by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const experiment = await ExperimentConfig.findById(req.params.id)
      .populate('creator', 'username email');
    
    if (!experiment) {
      return res.status(404).json({ message: 'Experiment not found' });
    }
    
    res.json(experiment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update experiment
router.put('/:id', auth, async (req, res) => {
  try {
    const experiment = await ExperimentConfig.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!experiment) {
      return res.status(404).json({ message: 'Experiment not found' });
    }
    
    res.json(experiment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Assign user to experiment variant
router.post('/:id/assign', auth, async (req, res) => {
  try {
    const experiment = await ExperimentConfig.findById(req.params.id);
    if (!experiment || experiment.status !== 'active') {
      return res.status(404).json({ message: 'Active experiment not found' });
    }

    const override = await AssignmentOverride.findOne({
      experiment: req.params.id,
      user: req.userId
    });

    let variant;
    if (override) {
      variant = override.variant;
    } else {
      const hash = crypto
        .createHash('sha256')
        .update(experiment.randomSeed + req.userId)
        .digest('hex');
      const hashValue = parseInt(hash.substring(0, 8), 16);
      const allocation = hashValue % 100;

      let cumulativeAllocation = 0;
      for (const v of experiment.variants) {
        cumulativeAllocation += v.allocation;
        if (allocation < cumulativeAllocation) {
          variant = v.id;
          break;
        }
      }
    }

    const exposure = await ExperimentExposure.findOneAndUpdate(
      { experiment: req.params.id, user: req.userId },
      {
        variant,
        timestamp: new Date(),
        platform: req.body.platform,
        userAgent: req.headers['user-agent'],
        region: req.body.region,
        metadata: req.body.metadata
      },
      { upsert: true, new: true }
    );

    res.json({ variant, exposure });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Track metric
router.post('/:id/track', auth, async (req, res) => {
  try {
    const { metric, value } = req.body;
    
    const exposure = await ExperimentExposure.findOne({
      experiment: req.params.id,
      user: req.userId
    });

    if (!exposure) {
      return res.status(404).json({ message: 'User not assigned to experiment' });
    }

    const metricRecord = new ExperimentMetric({
      experiment: req.params.id,
      exposure: exposure._id,
      user: req.userId,
      variant: exposure.variant,
      metric,
      value,
      timestamp: new Date()
    });

    await metricRecord.save();
    res.json({ message: 'Metric tracked successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get experiment results
router.get('/:id/results', auth, async (req, res) => {
  try {
    const experiment = await ExperimentConfig.findById(req.params.id);
    if (!experiment) {
      return res.status(404).json({ message: 'Experiment not found' });
    }

    const exposures = await ExperimentExposure.countDocuments({ 
      experiment: req.params.id 
    });

    const variantResults = await Promise.all(
      experiment.variants.map(async (variant) => {
        const variantExposures = await ExperimentExposure.countDocuments({
          experiment: req.params.id,
          variant: variant.id
        });

        const metrics = await ExperimentMetric.aggregate([
          {
            $match: {
              experiment: experiment._id,
              variant: variant.id
            }
          },
          {
            $group: {
              _id: '$metric',
              count: { $sum: 1 },
              sum: { $sum: '$value' },
              avg: { $avg: '$value' }
            }
          }
        ]);

        return {
          variant: variant.id,
          variantName: variant.name,
          exposures: variantExposures,
          metrics: metrics.reduce((acc, m) => {
            acc[m._id] = {
              count: m.count,
              sum: m.sum,
              avg: m.avg,
              conversionRate: m.count / variantExposures
            };
            return acc;
          }, {})
        };
      })
    );

    res.json({
      experimentId: experiment._id,
      experimentName: experiment.name,
      status: experiment.status,
      totalExposures: exposures,
      results: variantResults
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Export experiment (Feature 801)
router.get('/:id/export', auth, async (req, res) => {
  try {
    const experiment = await ExperimentConfig.findById(req.params.id);
    if (!experiment) {
      return res.status(404).json({ message: 'Experiment not found' });
    }

    const exposures = await ExperimentExposure.find({ 
      experiment: req.params.id 
    }).select('user variant timestamp');

    const metrics = await ExperimentMetric.find({ 
      experiment: req.params.id 
    });

    const overrides = await AssignmentOverride.find({ 
      experiment: req.params.id 
    });

    const bundle = {
      config: experiment.toObject(),
      randomSeed: experiment.randomSeed,
      exposures: exposures.map(e => ({
        user: e.user,
        variant: e.variant,
        timestamp: e.timestamp
      })),
      metrics: metrics.map(m => ({
        user: m.user,
        variant: m.variant,
        metric: m.metric,
        value: m.value,
        timestamp: m.timestamp
      })),
      overrides: overrides.map(o => ({
        user: o.user,
        variant: o.variant,
        reason: o.reason
      })),
      exportedAt: new Date(),
      exportedBy: req.userId,
      libraryVersions: {
        node: process.version,
        mongoose: require('mongoose').version
      }
    };

    const checksum = crypto
      .createHash('sha256')
      .update(JSON.stringify(bundle))
      .digest('hex');

    const hmac = crypto
      .createHmac('sha256', process.env.EXPERIMENT_SECRET || 'secret')
      .update(JSON.stringify(bundle))
      .digest('hex');

    const archive = new ExperimentArchive({
      experiment: req.params.id,
      ...bundle,
      checksum,
      signedBundle: hmac
    });

    await archive.save();

    res.json({
      archiveId: archive._id,
      checksum,
      signedBundle: hmac,
      bundle
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create assignment override
router.post('/:id/override', auth, async (req, res) => {
  try {
    const { targetUserId, variant, reason } = req.body;

    const override = new AssignmentOverride({
      experiment: req.params.id,
      user: targetUserId,
      variant,
      reason,
      creator: req.userId
    });

    await override.save();
    res.status(201).json(override);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Multi-armed bandit allocation (Feature 802)
router.post('/:id/allocate', auth, async (req, res) => {
  try {
    const experiment = await ExperimentConfig.findById(req.params.id);
    if (!experiment) {
      return res.status(404).json({ message: 'Experiment not found' });
    }

    const variantStats = await Promise.all(
      experiment.variants.map(async (variant) => {
        const state = await BanditState.findOne({
          experiment: req.params.id,
          variant: variant.id
        }).sort({ timestamp: -1 });

        const exposures = await ExperimentExposure.countDocuments({
          experiment: req.params.id,
          variant: variant.id
        });

        const successes = await ExperimentMetric.countDocuments({
          experiment: req.params.id,
          variant: variant.id,
          metric: 'conversion',
          value: { $gt: 0 }
        });

        const conversionRate = exposures > 0 ? successes / exposures : 0;

        return {
          variant: variant.id,
          pulls: exposures,
          successes,
          conversionRate,
          prevWeight: state?.weight || 0
        };
      })
    );

    const minSample = experiment.minSamplePerVariant || 100;
    const totalPulls = variantStats.reduce((sum, v) => sum + v.pulls, 0);

    const newAllocations = variantStats.map(v => {
      if (v.pulls < minSample) {
        return { ...v, weight: 1, allocationPercentage: 100 / variantStats.length };
      }

      const conservativeRate = v.conversionRate * 0.9;
      const weight = conservativeRate + Math.sqrt(2 * Math.log(totalPulls) / v.pulls);
      
      return { ...v, weight, allocationPercentage: 0 };
    });

    const totalWeight = newAllocations.reduce((sum, v) => sum + v.weight, 0);
    newAllocations.forEach(v => {
      v.allocationPercentage = (v.weight / totalWeight) * 100;
    });

    await Promise.all(
      newAllocations.map(v =>
        new BanditState({
          experiment: req.params.id,
          variant: v.variant,
          pulls: v.pulls,
          successes: v.successes,
          conversionRate: v.conversionRate,
          weight: v.weight,
          allocationPercentage: v.allocationPercentage,
          timestamp: new Date()
        }).save()
      )
    );

    experiment.variants.forEach(variant => {
      const alloc = newAllocations.find(a => a.variant === variant.id);
      if (alloc) {
        variant.allocation = Math.round(alloc.allocationPercentage);
      }
    });

    await experiment.save();

    res.json({
      experimentId: experiment._id,
      allocations: newAllocations,
      message: 'Allocations updated successfully'
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Merge user identities (Feature 803)
router.post('/identity/merge', auth, async (req, res) => {
  try {
    const { fromUserId, toUserId } = req.body;

    const exposures = await ExperimentExposure.updateMany(
      { user: fromUserId },
      { user: toUserId }
    );

    const metrics = await ExperimentMetric.updateMany(
      { user: fromUserId },
      { user: toUserId }
    );

    const mergeLog = new IdentityMergeLog({
      fromId: fromUserId,
      toId: toUserId,
      exposuresAdjusted: exposures.modifiedCount,
      metricsAdjusted: metrics.modifiedCount,
      timestamp: new Date(),
      metadata: { mergedBy: req.userId }
    });

    await mergeLog.save();

    res.json({
      message: 'Identity merge completed',
      exposuresAdjusted: exposures.modifiedCount,
      metricsAdjusted: metrics.modifiedCount
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Feature Flags

// Create feature flag
router.post('/flags', auth, async (req, res) => {
  try {
    const flag = new FeatureFlag({
      ...req.body,
      createdBy: req.userId
    });
    await flag.save();
    res.status(201).json(flag);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all feature flags
router.get('/flags', auth, async (req, res) => {
  try {
    const flags = await FeatureFlag.find().sort({ name: 1 });
    res.json(flags);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update feature flag
router.put('/flags/:name', auth, async (req, res) => {
  try {
    const flag = await FeatureFlag.findOneAndUpdate(
      { name: req.params.name },
      { ...req.body, updatedBy: req.userId },
      { new: true, runValidators: true }
    );
    
    if (!flag) {
      return res.status(404).json({ message: 'Feature flag not found' });
    }
    
    res.json(flag);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Evaluate feature flag for user (Feature 804)
router.post('/flags/:name/evaluate', auth, async (req, res) => {
  try {
    const flag = await FeatureFlag.findOne({ name: req.params.name });
    if (!flag) {
      return res.status(404).json({ message: 'Feature flag not found' });
    }

    if (!flag.enabled) {
      return res.json({ enabled: false, variant: null });
    }

    const { userAttributes, platform, region } = req.body;

    if (flag.targeting) {
      if (flag.targeting.platforms?.length && !flag.targeting.platforms.includes(platform)) {
        return res.json({ enabled: false, variant: null });
      }
      if (flag.targeting.regions?.length && !flag.targeting.regions.includes(region)) {
        return res.json({ enabled: false, variant: null });
      }
    }

    for (const rule of flag.rules || []) {
      if (evaluateCondition(rule.condition, { userAttributes, platform, region })) {
        return res.json({ 
          enabled: rule.enabled, 
          variant: rule.variant || flag.variants?.default 
        });
      }
    }

    res.json({ enabled: true, variant: flag.variants?.default });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Simulate feature flag (Feature 804)
router.post('/flags/simulate', auth, async (req, res) => {
  try {
    const { flagName, sampleUsers } = req.body;
    
    const flag = await FeatureFlag.findOne({ name: flagName });
    if (!flag) {
      return res.status(404).json({ message: 'Feature flag not found' });
    }

    const results = sampleUsers.map(user => {
      let enabled = flag.enabled;
      let variant = null;

      if (enabled && flag.rules) {
        for (const rule of flag.rules) {
          if (evaluateCondition(rule.condition, user)) {
            enabled = rule.enabled;
            variant = rule.variant;
            break;
          }
        }
      }

      return {
        userId: user.userId,
        enabled,
        variant: variant || flag.variants?.default,
        matchedRule: variant ? 'custom' : 'default'
      };
    });

    const summary = {
      totalUsers: sampleUsers.length,
      enabledCount: results.filter(r => r.enabled).length,
      variantDistribution: results.reduce((acc, r) => {
        if (r.enabled) {
          acc[r.variant || 'default'] = (acc[r.variant || 'default'] || 0) + 1;
        }
        return acc;
      }, {})
    };

    res.json({
      flag: flag.name,
      simulation: results,
      summary
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

function evaluateCondition(condition, context) {
  if (!condition) return true;
  
  try {
    if (condition.userSegment && context.userAttributes?.segment !== condition.userSegment) {
      return false;
    }
    if (condition.platform && context.platform !== condition.platform) {
      return false;
    }
    if (condition.region && context.region !== condition.region) {
      return false;
    }
    if (condition.custom) {
      return Object.entries(condition.custom).every(([key, value]) =>
        context.userAttributes?.[key] === value
      );
    }
    return true;
  } catch {
    return false;
  }
}

// Get experiment archives
router.get('/:id/archives', auth, async (req, res) => {
  try {
    const archives = await ExperimentArchive.find({ 
      experiment: req.params.id 
    })
      .select('-bundle')
      .sort({ exportedAt: -1 });
    
    res.json(archives);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get specific archive
router.get('/archives/:archiveId', auth, async (req, res) => {
  try {
    const archive = await ExperimentArchive.findById(req.params.archiveId);
    if (!archive) {
      return res.status(404).json({ message: 'Archive not found' });
    }
    
    res.json(archive);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
