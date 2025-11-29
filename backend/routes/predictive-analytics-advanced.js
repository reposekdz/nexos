const express = require('express');
const {
  TrendAlert,
  ForecastRule,
  RiskScore,
  CohortAnalysis,
  EventCorrelation,
  PredictiveMaintenance,
  ForecastDashboard
} = require('../models/AdvancedAnalyticsPredictive');
const auth = require('../middleware/auth');
const router = express.Router();

router.post('/alerts', auth, async (req, res) => {
  try {
    const alert = new TrendAlert({
      alertId: `ALERT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...req.body,
      owner: req.userId,
      tenantId: req.tenantId
    });
    
    await alert.save();
    
    res.status(201).json(alert);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/alerts', auth, async (req, res) => {
  try {
    const { status, severity, metric } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    
    const filter = {
      $or: [
        { owner: req.userId },
        { tenantId: req.tenantId }
      ]
    };
    
    if (status) filter.status = status;
    if (severity) filter.severity = severity;
    if (metric) filter.metric = metric;
    
    const alerts = await TrendAlert.find(filter)
      .sort({ triggeredAt: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);
    
    const total = await TrendAlert.countDocuments(filter);
    
    res.json({
      alerts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/alerts/:id', auth, async (req, res) => {
  try {
    const alert = await TrendAlert.findOne({
      _id: req.params.id,
      owner: req.userId
    });
    
    if (!alert) {
      return res.status(404).json({ message: 'Alert not found' });
    }
    
    Object.assign(alert, req.body);
    await alert.save();
    
    res.json(alert);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/alerts/:id/resolve', auth, async (req, res) => {
  try {
    const alert = await TrendAlert.findOne({
      _id: req.params.id,
      owner: req.userId
    });
    
    if (!alert) {
      return res.status(404).json({ message: 'Alert not found' });
    }
    
    alert.status = 'resolved';
    alert.resolvedAt = new Date();
    await alert.save();
    
    res.json(alert);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/forecasts', auth, async (req, res) => {
  try {
    const forecast = new ForecastRule({
      ruleId: `FCST-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...req.body,
      owner: req.userId,
      tenantId: req.tenantId
    });
    
    await forecast.save();
    
    res.status(201).json(forecast);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/forecasts', auth, async (req, res) => {
  try {
    const { enabled, algorithm } = req.query;
    
    const filter = {
      $or: [
        { owner: req.userId },
        { tenantId: req.tenantId }
      ]
    };
    
    if (enabled !== undefined) filter.enabled = enabled === 'true';
    if (algorithm) filter.algorithm = algorithm;
    
    const forecasts = await ForecastRule.find(filter)
      .sort({ nextRun: 1 });
    
    res.json(forecasts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/forecasts/:id', auth, async (req, res) => {
  try {
    const forecast = await ForecastRule.findOne({
      _id: req.params.id,
      $or: [
        { owner: req.userId },
        { tenantId: req.tenantId }
      ]
    });
    
    if (!forecast) {
      return res.status(404).json({ message: 'Forecast not found' });
    }
    
    res.json(forecast);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/forecasts/:id/run', auth, async (req, res) => {
  try {
    const forecast = await ForecastRule.findOne({
      _id: req.params.id,
      owner: req.userId
    });
    
    if (!forecast) {
      return res.status(404).json({ message: 'Forecast not found' });
    }
    
    const historicalData = forecast.historicalData.slice(-forecast.parameters.historicalPeriod);
    const predictions = [];
    
    if (forecast.algorithm === 'moving_average') {
      const window = Math.min(7, historicalData.length);
      for (let i = 0; i < forecast.parameters.forecastPeriod; i++) {
        const recentData = [...historicalData, ...predictions].slice(-window);
        const avg = recentData.reduce((sum, d) => sum + d.value, 0) / recentData.length;
        predictions.push({
          timestamp: new Date(Date.now() + (i + 1) * 24 * 60 * 60 * 1000),
          predictedValue: avg,
          lowerBound: avg * 0.9,
          upperBound: avg * 1.1,
          confidence: 0.85
        });
      }
    } else if (forecast.algorithm === 'exponential_smoothing') {
      const alpha = forecast.parameters.smoothingFactor || 0.3;
      let lastValue = historicalData[historicalData.length - 1]?.value || 0;
      
      for (let i = 0; i < forecast.parameters.forecastPeriod; i++) {
        predictions.push({
          timestamp: new Date(Date.now() + (i + 1) * 24 * 60 * 60 * 1000),
          predictedValue: lastValue,
          lowerBound: lastValue * 0.85,
          upperBound: lastValue * 1.15,
          confidence: 0.8
        });
      }
    } else if (forecast.algorithm === 'linear') {
      const n = historicalData.length;
      let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
      
      historicalData.forEach((d, i) => {
        sumX += i;
        sumY += d.value;
        sumXY += i * d.value;
        sumX2 += i * i;
      });
      
      const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
      const intercept = (sumY - slope * sumX) / n;
      
      for (let i = 0; i < forecast.parameters.forecastPeriod; i++) {
        const x = n + i;
        const predicted = slope * x + intercept;
        predictions.push({
          timestamp: new Date(Date.now() + (i + 1) * 24 * 60 * 60 * 1000),
          predictedValue: predicted,
          lowerBound: predicted * 0.88,
          upperBound: predicted * 1.12,
          confidence: 0.75
        });
      }
    }
    
    forecast.forecasts = predictions;
    forecast.lastRun = new Date();
    forecast.nextRun = new Date(Date.now() + (forecast.runFrequency === 'hourly' ? 3600000 : forecast.runFrequency === 'daily' ? 86400000 : 604800000));
    
    const actualValues = historicalData.slice(-predictions.length);
    if (actualValues.length > 0) {
      const errors = actualValues.map((actual, i) => Math.abs(actual.value - (predictions[i]?.predictedValue || 0)));
      const mae = errors.reduce((sum, e) => sum + e, 0) / errors.length;
      const mape = errors.reduce((sum, e, i) => sum + (e / actualValues[i].value * 100), 0) / errors.length;
      
      forecast.accuracy = {
        mae,
        mape,
        rmse: Math.sqrt(errors.reduce((sum, e) => sum + e * e, 0) / errors.length)
      };
    }
    
    await forecast.save();
    
    res.json(forecast);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/risk-scores', auth, async (req, res) => {
  try {
    const riskScore = new RiskScore({
      ...req.body,
      calculatedBy: req.userId
    });
    
    let totalScore = 0;
    let totalWeight = 0;
    
    riskScore.factors.forEach(factor => {
      totalScore += factor.score * factor.weight;
      totalWeight += factor.weight;
    });
    
    riskScore.score = Math.min(100, Math.round(totalScore / totalWeight));
    
    if (riskScore.score >= 75) riskScore.level = 'critical';
    else if (riskScore.score >= 50) riskScore.level = 'high';
    else if (riskScore.score >= 25) riskScore.level = 'medium';
    else riskScore.level = 'low';
    
    await riskScore.save();
    
    if (riskScore.level === 'critical' && riskScore.actions.length > 0) {
      for (const action of riskScore.actions) {
        if (action.type === 'alert') {
          const alert = new TrendAlert({
            alertId: `RISK-${Date.now()}`,
            name: `High Risk: ${riskScore.resourceType}`,
            metric: 'risk_score',
            resourceType: riskScore.resourceType,
            condition: { type: 'threshold', value: riskScore.score },
            status: 'triggered',
            severity: 'critical',
            owner: req.userId
          });
          await alert.save();
        }
      }
    }
    
    res.status(201).json(riskScore);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/risk-scores', auth, async (req, res) => {
  try {
    const { resourceType, level } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    
    const filter = {};
    
    if (resourceType) filter.resourceType = resourceType;
    if (level) filter.level = level;
    
    const scores = await RiskScore.find(filter)
      .sort({ score: -1, calculatedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);
    
    const total = await RiskScore.countDocuments(filter);
    
    res.json({
      scores,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/cohorts', auth, async (req, res) => {
  try {
    const cohort = new CohortAnalysis({
      cohortId: `COHORT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...req.body,
      createdBy: req.userId
    });
    
    await cohort.save();
    
    res.status(201).json(cohort);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/cohorts', auth, async (req, res) => {
  try {
    const cohorts = await CohortAnalysis.find({
      createdBy: req.userId
    }).sort({ startDate: -1 });
    
    res.json(cohorts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/cohorts/:id', auth, async (req, res) => {
  try {
    const cohort = await CohortAnalysis.findOne({
      _id: req.params.id,
      createdBy: req.userId
    });
    
    if (!cohort) {
      return res.status(404).json({ message: 'Cohort not found' });
    }
    
    res.json(cohort);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/correlations', auth, async (req, res) => {
  try {
    const correlation = new EventCorrelation({
      correlationId: `CORR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...req.body,
      discoveredBy: req.userId
    });
    
    await correlation.save();
    
    res.status(201).json(correlation);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/correlations', auth, async (req, res) => {
  try {
    const { minStrength, pattern } = req.query;
    
    const filter = {};
    
    if (minStrength) filter.strength = { $gte: parseFloat(minStrength) };
    if (pattern) filter.pattern = pattern;
    
    const correlations = await EventCorrelation.find(filter)
      .sort({ strength: -1, occurrenceCount: -1 });
    
    res.json(correlations);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/maintenance', auth, async (req, res) => {
  try {
    const maintenance = new PredictiveMaintenance({
      predictionId: `MAINT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...req.body
    });
    
    await maintenance.save();
    
    res.status(201).json(maintenance);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/maintenance', auth, async (req, res) => {
  try {
    const { device, severity, status } = req.query;
    
    const filter = {};
    
    if (device) filter.device = device;
    if (severity) filter.severity = severity;
    if (status) filter.status = status;
    
    const predictions = await PredictiveMaintenance.find(filter)
      .sort({ failureProbability: -1, predictedFailureDate: 1 })
      .populate('device', 'name deviceId type');
    
    res.json(predictions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/dashboards', auth, async (req, res) => {
  try {
    const dashboard = new ForecastDashboard({
      dashboardId: `DASH-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
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
    const dashboards = await ForecastDashboard.find({
      $or: [
        { owner: req.userId },
        { sharedWith: req.userId },
        { isPublic: true }
      ]
    }).sort({ lastViewed: -1 });
    
    res.json(dashboards);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/dashboards/:id', auth, async (req, res) => {
  try {
    const dashboard = await ForecastDashboard.findById(req.params.id);
    
    if (!dashboard) {
      return res.status(404).json({ message: 'Dashboard not found' });
    }
    
    dashboard.lastViewed = new Date();
    await dashboard.save();
    
    res.json(dashboard);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/dashboards/:id', auth, async (req, res) => {
  try {
    const dashboard = await ForecastDashboard.findOne({
      _id: req.params.id,
      owner: req.userId
    });
    
    if (!dashboard) {
      return res.status(404).json({ message: 'Dashboard not found' });
    }
    
    Object.assign(dashboard, req.body);
    await dashboard.save();
    
    res.json(dashboard);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
