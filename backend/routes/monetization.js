const express = require('express');
const router = express.Router();
const { Monetization, Subscription, VirtualCurrency } = require('../models/Monetization');
const User = require('../models/User');
const auth = require('../middleware/auth');

// Creator Monetization (20 APIs)
router.get('/earnings', auth, async (req, res) => {
  try {
    const earnings = await Monetization.find({ user: req.user.id, status: 'completed' });
    const total = earnings.reduce((sum, e) => sum + e.netAmount, 0);
    res.json({ total, earnings });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/earnings/breakdown', auth, async (req, res) => {
  try {
    const earnings = await Monetization.find({ user: req.user.id, status: 'completed' });
    const breakdown = earnings.reduce((acc, e) => {
      acc[e.type] = (acc[e.type] || 0) + e.netAmount;
      return acc;
    }, {});
    res.json(breakdown);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/ad-revenue/enable', auth, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user.id, { 'monetization.adRevenueEnabled': true });
    res.json({ message: 'Ad revenue sharing enabled' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/content/:contentId/monetize', auth, async (req, res) => {
  try {
    const { contentType, amount } = req.body;
    const monetization = new Monetization({
      user: req.user.id,
      type: 'ad_revenue',
      amount,
      netAmount: amount * 0.7,
      platformFee: amount * 0.3,
      source: { contentId: req.params.contentId, contentType }
    });
    await monetization.save();
    res.json(monetization);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/subscriptions/create-tier', auth, async (req, res) => {
  try {
    const { name, price, benefits, badgeUrl } = req.body;
    await User.findByIdAndUpdate(req.user.id, {
      $push: { 'monetization.subscriptionTiers': { name, price, benefits, badgeUrl } }
    });
    res.json({ message: 'Subscription tier created' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/subscriptions/tiers', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    res.json(user.monetization?.subscriptionTiers || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/subscriptions/subscribe/:creatorId', auth, async (req, res) => {
  try {
    const { tierId } = req.body;
    const creator = await User.findById(req.params.creatorId);
    const tier = creator.monetization.subscriptionTiers.id(tierId);
    const subscription = new Subscription({
      creator: req.params.creatorId,
      subscriber: req.user.id,
      tier: { name: tier.name, price: tier.price, benefits: tier.benefits, badgeUrl: tier.badgeUrl },
      endDate: new Date(Date.now() + 30 * 86400000)
    });
    await subscription.save();
    res.json(subscription);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/subscriptions/my-subscribers', auth, async (req, res) => {
  try {
    const subscriptions = await Subscription.find({ creator: req.user.id, status: 'active' }).populate('subscriber');
    res.json(subscriptions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/subscriptions/my-subscriptions', auth, async (req, res) => {
  try {
    const subscriptions = await Subscription.find({ subscriber: req.user.id, status: 'active' }).populate('creator');
    res.json(subscriptions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/subscriptions/:id/cancel', auth, async (req, res) => {
  try {
    await Subscription.findByIdAndUpdate(req.params.id, { status: 'cancelled', autoRenew: false });
    res.json({ message: 'Subscription cancelled' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/donations/enable', auth, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user.id, { 'monetization.donationsEnabled': true });
    res.json({ message: 'Donations enabled' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/donations/send/:userId', auth, async (req, res) => {
  try {
    const { amount, message } = req.body;
    const monetization = new Monetization({
      user: req.params.userId,
      type: 'donation',
      amount,
      netAmount: amount * 0.95,
      platformFee: amount * 0.05,
      source: { fromUser: req.user.id },
      status: 'completed'
    });
    await monetization.save();
    res.json({ message: 'Donation sent', monetization });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/tips/send/:userId', auth, async (req, res) => {
  try {
    const { amount, contentId } = req.body;
    const monetization = new Monetization({
      user: req.params.userId,
      type: 'tip',
      amount,
      netAmount: amount * 0.95,
      platformFee: amount * 0.05,
      source: { fromUser: req.user.id, contentId },
      status: 'completed'
    });
    await monetization.save();
    res.json({ message: 'Tip sent', monetization });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/premium-content/create', auth, async (req, res) => {
  try {
    const { contentId, price } = req.body;
    await User.findByIdAndUpdate(req.user.id, {
      $push: { 'monetization.premiumContent': { contentId, price } }
    });
    res.json({ message: 'Premium content created' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/premium-content/:contentId/purchase', auth, async (req, res) => {
  try {
    const { creatorId, price } = req.body;
    const monetization = new Monetization({
      user: creatorId,
      type: 'premium_content',
      amount: price,
      netAmount: price * 0.7,
      platformFee: price * 0.3,
      source: { fromUser: req.user.id, contentId: req.params.contentId },
      status: 'completed'
    });
    await monetization.save();
    res.json({ message: 'Content purchased', access: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/payout/balance', auth, async (req, res) => {
  try {
    const earnings = await Monetization.find({ user: req.user.id, status: 'completed', payoutDate: null });
    const balance = earnings.reduce((sum, e) => sum + e.netAmount, 0);
    res.json({ balance, pendingEarnings: earnings.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/payout/request', auth, async (req, res) => {
  try {
    const { amount, method } = req.body;
    const earnings = await Monetization.find({ user: req.user.id, status: 'completed', payoutDate: null });
    const balance = earnings.reduce((sum, e) => sum + e.netAmount, 0);
    if (balance < amount) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }
    await Monetization.updateMany(
      { user: req.user.id, status: 'completed', payoutDate: null },
      { payoutDate: new Date() }
    );
    res.json({ message: 'Payout requested', amount, method });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/payout/history', auth, async (req, res) => {
  try {
    const payouts = await Monetization.find({ user: req.user.id, payoutDate: { $ne: null } }).sort('-payoutDate');
    res.json(payouts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/analytics/revenue', auth, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const earnings = await Monetization.find({
      user: req.user.id,
      status: 'completed',
      createdAt: { $gte: startDate, $lte: endDate }
    });
    const total = earnings.reduce((sum, e) => sum + e.netAmount, 0);
    const byType = earnings.reduce((acc, e) => {
      acc[e.type] = (acc[e.type] || 0) + e.netAmount;
      return acc;
    }, {});
    res.json({ total, byType, transactions: earnings.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/sponsored-content/opportunities', auth, async (req, res) => {
  try {
    const opportunities = [
      { brand: 'TechCorp', budget: 5000, category: 'Technology' },
      { brand: 'FashionBrand', budget: 3000, category: 'Fashion' }
    ];
    res.json(opportunities);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
