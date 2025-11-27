const express = require('express');
const router = express.Router();
const User = require('../models/User');
const auth = require('../middleware/auth');

// Premium Features (10 APIs)
router.post('/subscribe', auth, async (req, res) => {
  try {
    const { plan, duration } = req.body;
    await User.findByIdAndUpdate(req.user.id, { 
      isPremium: true, 
      premiumPlan: plan,
      premiumExpiry: new Date(Date.now() + duration * 86400000)
    });
    res.json({ message: 'Premium subscription activated', plan });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/cancel', auth, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user.id, { isPremium: false });
    res.json({ message: 'Premium subscription cancelled' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/features', async (req, res) => {
  try {
    const features = {
      basic: ['Ad-free browsing', 'HD video', 'Priority support'],
      pro: ['All basic features', 'Advanced analytics', 'Custom themes', 'Unlimited storage'],
      enterprise: ['All pro features', 'API access', 'Dedicated support', 'White-label']
    };
    res.json(features);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/plans', async (req, res) => {
  try {
    const plans = [
      { name: 'Basic', price: 4.99, duration: 'monthly', features: ['Ad-free', 'HD video'] },
      { name: 'Pro', price: 9.99, duration: 'monthly', features: ['All basic', 'Analytics', 'Themes'] },
      { name: 'Enterprise', price: 49.99, duration: 'monthly', features: ['All pro', 'API', 'Support'] }
    ];
    res.json(plans);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/status', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    res.json({ isPremium: user.isPremium, plan: user.premiumPlan, expiry: user.premiumExpiry });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/upgrade', auth, async (req, res) => {
  try {
    const { newPlan } = req.body;
    await User.findByIdAndUpdate(req.user.id, { premiumPlan: newPlan });
    res.json({ message: 'Plan upgraded', newPlan });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/gift/:userId', auth, async (req, res) => {
  try {
    const { duration } = req.body;
    await User.findByIdAndUpdate(req.params.userId, { 
      isPremium: true,
      premiumExpiry: new Date(Date.now() + duration * 86400000)
    });
    res.json({ message: 'Premium gifted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/benefits', auth, async (req, res) => {
  try {
    const benefits = ['No ads', 'HD streaming', 'Priority support', 'Custom themes', 'Advanced analytics'];
    res.json(benefits);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/trial', auth, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user.id, { 
      isPremium: true,
      premiumPlan: 'trial',
      premiumExpiry: new Date(Date.now() + 7 * 86400000)
    });
    res.json({ message: '7-day trial activated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/usage', auth, async (req, res) => {
  try {
    const usage = { storage: '5GB / 100GB', apiCalls: '1000 / 10000', analytics: 'enabled' };
    res.json(usage);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
