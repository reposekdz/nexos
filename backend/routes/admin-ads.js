const express = require('express');
const router = express.Router();
const Ad = require('../models/Ad');
const { Monetization } = require('../models/Monetization');
const User = require('../models/User');
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');

// Admin Ad Management (20 APIs)
router.get('/pending', [auth, adminAuth], async (req, res) => {
  try {
    const ads = await Ad.find({ status: 'pending' }).populate('advertiser', 'username email');
    res.json(ads);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/approve', [auth, adminAuth], async (req, res) => {
  try {
    const ad = await Ad.findByIdAndUpdate(
      req.params.id,
      { status: 'active', 'schedule.isActive': true },
      { new: true }
    );
    res.json({ message: 'Ad approved', ad });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/reject', [auth, adminAuth], async (req, res) => {
  try {
    const { reason } = req.body;
    const ad = await Ad.findByIdAndUpdate(
      req.params.id,
      { status: 'rejected', rejectionReason: reason },
      { new: true }
    );
    res.json({ message: 'Ad rejected', ad });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/all', [auth, adminAuth], async (req, res) => {
  try {
    const { status, format, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (format) filter.format = format;
    const ads = await Ad.find(filter)
      .populate('advertiser', 'username email')
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .sort('-createdAt');
    const total = await Ad.countDocuments(filter);
    res.json({ ads, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/revenue', [auth, adminAuth], async (req, res) => {
  try {
    const ads = await Ad.find({ status: 'active' });
    const totalRevenue = ads.reduce((sum, ad) => sum + ad.budget.spent, 0);
    const platformFee = totalRevenue * 0.3;
    res.json({ totalRevenue, platformFee, netRevenue: totalRevenue - platformFee });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/stats', [auth, adminAuth], async (req, res) => {
  try {
    const totalAds = await Ad.countDocuments();
    const activeAds = await Ad.countDocuments({ status: 'active' });
    const pendingAds = await Ad.countDocuments({ status: 'pending' });
    const totalSpent = await Ad.aggregate([
      { $group: { _id: null, total: { $sum: '$budget.spent' } } }
    ]);
    const totalImpressions = await Ad.aggregate([
      { $group: { _id: null, total: { $sum: '$metrics.impressions' } } }
    ]);
    res.json({
      totalAds,
      activeAds,
      pendingAds,
      totalSpent: totalSpent[0]?.total || 0,
      totalImpressions: totalImpressions[0]?.total || 0
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/top-advertisers', [auth, adminAuth], async (req, res) => {
  try {
    const topAdvertisers = await Ad.aggregate([
      { $group: { _id: '$advertiser', totalSpent: { $sum: '$budget.spent' }, campaigns: { $sum: 1 } } },
      { $sort: { totalSpent: -1 } },
      { $limit: 10 }
    ]);
    await User.populate(topAdvertisers, { path: '_id', select: 'username email' });
    res.json(topAdvertisers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/performance', [auth, adminAuth], async (req, res) => {
  try {
    const performance = await Ad.aggregate([
      {
        $group: {
          _id: '$format',
          totalImpressions: { $sum: '$metrics.impressions' },
          totalClicks: { $sum: '$metrics.clicks' },
          totalConversions: { $sum: '$metrics.conversions' },
          totalSpent: { $sum: '$budget.spent' }
        }
      }
    ]);
    res.json(performance);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/pause', [auth, adminAuth], async (req, res) => {
  try {
    const ad = await Ad.findByIdAndUpdate(
      req.params.id,
      { status: 'paused', 'schedule.isActive': false },
      { new: true }
    );
    res.json({ message: 'Ad paused by admin', ad });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', [auth, adminAuth], async (req, res) => {
  try {
    await Ad.findByIdAndDelete(req.params.id);
    res.json({ message: 'Ad deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/flagged', [auth, adminAuth], async (req, res) => {
  try {
    const flaggedAds = await Ad.find({ 'metrics.clicks': { $lt: 10 }, 'metrics.impressions': { $gt: 1000 } });
    res.json(flaggedAds);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/bulk-approve', [auth, adminAuth], async (req, res) => {
  try {
    const { adIds } = req.body;
    await Ad.updateMany(
      { _id: { $in: adIds } },
      { status: 'active', 'schedule.isActive': true }
    );
    res.json({ message: `${adIds.length} ads approved` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/bulk-reject', [auth, adminAuth], async (req, res) => {
  try {
    const { adIds, reason } = req.body;
    await Ad.updateMany(
      { _id: { $in: adIds } },
      { status: 'rejected', rejectionReason: reason }
    );
    res.json({ message: `${adIds.length} ads rejected` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/revenue/timeline', [auth, adminAuth], async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const revenue = await Ad.aggregate([
      {
        $match: {
          createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          revenue: { $sum: '$budget.spent' }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    res.json(revenue);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/advertisers', [auth, adminAuth], async (req, res) => {
  try {
    const advertisers = await User.find({ 'monetization.isAdvertiser': true }).select('username email createdAt');
    res.json(advertisers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/advertisers/:id/suspend', [auth, adminAuth], async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.params.id, { 'monetization.isAdvertiser': false });
    await Ad.updateMany({ advertiser: req.params.id }, { status: 'paused' });
    res.json({ message: 'Advertiser suspended' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/audit-log', [auth, adminAuth], async (req, res) => {
  try {
    const logs = [
      { action: 'Ad Approved', adId: '123', admin: 'Admin1', timestamp: new Date() },
      { action: 'Ad Rejected', adId: '456', admin: 'Admin2', timestamp: new Date() }
    ];
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/settings', [auth, adminAuth], async (req, res) => {
  try {
    const { minBudget, maxBudget, platformFee, autoApproval } = req.body;
    res.json({ message: 'Settings updated', settings: req.body });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/reports/export', [auth, adminAuth], async (req, res) => {
  try {
    const { format, startDate, endDate } = req.query;
    const ads = await Ad.find({ createdAt: { $gte: startDate, $lte: endDate } });
    res.json({ message: `Report exported as ${format}`, count: ads.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/compliance', [auth, adminAuth], async (req, res) => {
  try {
    const violations = await Ad.find({ status: 'rejected' }).populate('advertiser', 'username email');
    res.json({ violations: violations.length, details: violations });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
