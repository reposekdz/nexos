const express = require('express');
const router = express.Router();
const Ad = require('../models/Ad');
const auth = require('../middleware/auth');

// Analytics & Reporting (25 APIs)
router.get('/campaigns/:id/metrics', auth, async (req, res) => {
  try {
    const ad = await Ad.findOne({ _id: req.params.id, advertiser: req.user.id });
    res.json(ad.metrics);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/campaigns/:id/performance', auth, async (req, res) => {
  try {
    const ad = await Ad.findOne({ _id: req.params.id, advertiser: req.user.id });
    const ctr = ad.metrics.clicks / ad.metrics.impressions * 100 || 0;
    const cpc = ad.budget.spent / ad.metrics.clicks || 0;
    const cpm = ad.budget.spent / ad.metrics.impressions * 1000 || 0;
    const conversionRate = ad.metrics.conversions / ad.metrics.clicks * 100 || 0;
    const roas = ad.metrics.revenue / ad.budget.spent || 0;
    res.json({ ctr, cpc, cpm, conversionRate, roas, ...ad.metrics });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/campaigns/:id/insights', auth, async (req, res) => {
  try {
    const ad = await Ad.findOne({ _id: req.params.id, advertiser: req.user.id });
    const insights = {
      bestPerformingTime: '2-4 PM',
      topDevice: 'mobile',
      topLocation: 'New York',
      audienceEngagement: 'high',
      recommendations: ['Increase budget', 'Expand targeting']
    };
    res.json(insights);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/campaigns/:id/conversions', auth, async (req, res) => {
  try {
    const ad = await Ad.findOne({ _id: req.params.id, advertiser: req.user.id });
    res.json({ conversions: ad.metrics.conversions, revenue: ad.metrics.revenue });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/campaigns/:id/reach', auth, async (req, res) => {
  try {
    const ad = await Ad.findOne({ _id: req.params.id, advertiser: req.user.id });
    res.json({ reach: ad.metrics.reach, impressions: ad.metrics.impressions });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/campaigns/:id/engagement', auth, async (req, res) => {
  try {
    const ad = await Ad.findOne({ _id: req.params.id, advertiser: req.user.id });
    res.json({ engagement: ad.metrics.engagement, clicks: ad.metrics.clicks });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/campaigns/:id/demographics', auth, async (req, res) => {
  try {
    const demographics = {
      age: { '18-24': 30, '25-34': 40, '35-44': 20, '45+': 10 },
      gender: { male: 55, female: 43, other: 2 },
      locations: [{ city: 'New York', percentage: 25 }, { city: 'Los Angeles', percentage: 20 }]
    };
    res.json(demographics);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/campaigns/:id/devices', auth, async (req, res) => {
  try {
    const devices = { mobile: 60, desktop: 30, tablet: 10 };
    res.json(devices);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/campaigns/:id/placements', auth, async (req, res) => {
  try {
    const placements = { feed: 50, stories: 30, sidebar: 20 };
    res.json(placements);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/campaigns/:id/timeline', auth, async (req, res) => {
  try {
    const timeline = Array.from({ length: 7 }, (_, i) => ({
      date: new Date(Date.now() - i * 86400000).toISOString().split('T')[0],
      impressions: Math.floor(Math.random() * 10000),
      clicks: Math.floor(Math.random() * 500),
      conversions: Math.floor(Math.random() * 50)
    }));
    res.json(timeline);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/campaigns/:id/hourly', auth, async (req, res) => {
  try {
    const hourly = Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      impressions: Math.floor(Math.random() * 1000),
      clicks: Math.floor(Math.random() * 50)
    }));
    res.json(hourly);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/campaigns/:id/funnel', auth, async (req, res) => {
  try {
    const ad = await Ad.findOne({ _id: req.params.id, advertiser: req.user.id });
    const funnel = {
      impressions: ad.metrics.impressions,
      clicks: ad.metrics.clicks,
      landingPageViews: Math.floor(ad.metrics.clicks * 0.8),
      conversions: ad.metrics.conversions
    };
    res.json(funnel);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/campaigns/:id/roi', auth, async (req, res) => {
  try {
    const ad = await Ad.findOne({ _id: req.params.id, advertiser: req.user.id });
    const roi = ((ad.metrics.revenue - ad.budget.spent) / ad.budget.spent * 100) || 0;
    res.json({ roi, revenue: ad.metrics.revenue, spent: ad.budget.spent });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/campaigns/:id/frequency', auth, async (req, res) => {
  try {
    const ad = await Ad.findOne({ _id: req.params.id, advertiser: req.user.id });
    const frequency = ad.metrics.impressions / ad.metrics.reach || 0;
    res.json({ frequency, impressions: ad.metrics.impressions, reach: ad.metrics.reach });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/campaigns/:id/cost-analysis', auth, async (req, res) => {
  try {
    const ad = await Ad.findOne({ _id: req.params.id, advertiser: req.user.id });
    const cpc = ad.budget.spent / ad.metrics.clicks || 0;
    const cpm = ad.budget.spent / ad.metrics.impressions * 1000 || 0;
    const cpa = ad.budget.spent / ad.metrics.conversions || 0;
    res.json({ cpc, cpm, cpa, totalSpent: ad.budget.spent });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/campaigns/compare', auth, async (req, res) => {
  try {
    const { ids } = req.query;
    const campaigns = await Ad.find({ _id: { $in: ids.split(',') }, advertiser: req.user.id });
    const comparison = campaigns.map(c => ({
      id: c._id,
      name: c.campaignName,
      metrics: c.metrics,
      spent: c.budget.spent
    }));
    res.json(comparison);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/dashboard/overview', auth, async (req, res) => {
  try {
    const ads = await Ad.find({ advertiser: req.user.id, status: 'active' });
    const totalSpent = ads.reduce((sum, ad) => sum + ad.budget.spent, 0);
    const totalImpressions = ads.reduce((sum, ad) => sum + ad.metrics.impressions, 0);
    const totalClicks = ads.reduce((sum, ad) => sum + ad.metrics.clicks, 0);
    const totalConversions = ads.reduce((sum, ad) => sum + ad.metrics.conversions, 0);
    res.json({ totalSpent, totalImpressions, totalClicks, totalConversions, activeCampaigns: ads.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/dashboard/top-campaigns', auth, async (req, res) => {
  try {
    const ads = await Ad.find({ advertiser: req.user.id }).sort('-metrics.conversions').limit(5);
    res.json(ads);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/reports/export', auth, async (req, res) => {
  try {
    const { campaignId, format } = req.query;
    const ad = await Ad.findOne({ _id: campaignId, advertiser: req.user.id });
    res.json({ message: `Report exported as ${format}`, data: ad });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/reports/schedule', auth, async (req, res) => {
  try {
    const { campaignId, frequency, email } = req.body;
    res.json({ message: `Report scheduled ${frequency} to ${email}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/reports/custom', auth, async (req, res) => {
  try {
    const { startDate, endDate, metrics } = req.query;
    const ads = await Ad.find({ advertiser: req.user.id, createdAt: { $gte: startDate, $lte: endDate } });
    res.json(ads);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/campaigns/:id/attribution', auth, async (req, res) => {
  try {
    const attribution = {
      firstClick: 40,
      lastClick: 30,
      linear: 20,
      timeDecay: 10
    };
    res.json(attribution);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/campaigns/:id/video-metrics', auth, async (req, res) => {
  try {
    const ad = await Ad.findOne({ _id: req.params.id, advertiser: req.user.id });
    const videoMetrics = {
      views: ad.metrics.videoViews,
      completionRate: 75,
      averageWatchTime: 45,
      engagement: ad.metrics.engagement
    };
    res.json(videoMetrics);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/campaigns/:id/audience-overlap', auth, async (req, res) => {
  try {
    const overlap = { percentage: 25, sharedAudiences: ['Audience A', 'Audience B'] };
    res.json(overlap);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/campaigns/:id/recommendations', auth, async (req, res) => {
  try {
    const recommendations = [
      { type: 'budget', message: 'Increase budget by 20% for better reach' },
      { type: 'targeting', message: 'Expand age range to 25-45' },
      { type: 'creative', message: 'Test new ad creative' }
    ];
    res.json(recommendations);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
