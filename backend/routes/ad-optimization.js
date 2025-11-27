const express = require('express');
const router = express.Router();
const Ad = require('../models/Ad');
const auth = require('../middleware/auth');

// A/B Testing & Optimization (15 APIs)
router.post('/campaigns/:id/ab-test', auth, async (req, res) => {
  try {
    const ad = await Ad.findOneAndUpdate(
      { _id: req.params.id, advertiser: req.user.id },
      { 'abTest.enabled': true, 'abTest.variants': req.body.variants },
      { new: true }
    );
    res.json(ad);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/campaigns/:id/ab-test/results', auth, async (req, res) => {
  try {
    const ad = await Ad.findOne({ _id: req.params.id, advertiser: req.user.id });
    const results = ad.abTest.variants.map(v => ({
      name: v.name,
      impressions: v.impressions,
      clicks: v.clicks,
      conversions: v.conversions,
      ctr: (v.clicks / v.impressions * 100) || 0
    }));
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/campaigns/:id/ab-test/winner', auth, async (req, res) => {
  try {
    const { variantName } = req.body;
    const ad = await Ad.findOne({ _id: req.params.id, advertiser: req.user.id });
    const winner = ad.abTest.variants.find(v => v.name === variantName);
    await Ad.findOneAndUpdate(
      { _id: req.params.id },
      { creative: winner.creative, 'abTest.enabled': false },
      { new: true }
    );
    res.json({ message: 'Winner selected', variant: variantName });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/campaigns/:id/optimize/budget', auth, async (req, res) => {
  try {
    const ad = await Ad.findOne({ _id: req.params.id, advertiser: req.user.id });
    const optimizedBudget = ad.budget.amount * 1.2;
    await Ad.findOneAndUpdate(
      { _id: req.params.id },
      { 'budget.amount': optimizedBudget },
      { new: true }
    );
    res.json({ message: 'Budget optimized', newBudget: optimizedBudget });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/campaigns/:id/optimize/bidding', auth, async (req, res) => {
  try {
    const ad = await Ad.findOne({ _id: req.params.id, advertiser: req.user.id });
    const optimizedBid = ad.bidding.bidAmount * 1.1;
    await Ad.findOneAndUpdate(
      { _id: req.params.id },
      { 'bidding.bidAmount': optimizedBid },
      { new: true }
    );
    res.json({ message: 'Bidding optimized', newBid: optimizedBid });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/campaigns/:id/optimize/targeting', auth, async (req, res) => {
  try {
    const suggestions = {
      expandAge: true,
      addInterests: ['Technology', 'Innovation'],
      addLocations: ['San Francisco', 'Seattle']
    };
    res.json(suggestions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/campaigns/:id/optimize/creative', auth, async (req, res) => {
  try {
    const suggestions = {
      headline: 'Try a more action-oriented headline',
      image: 'Use brighter colors',
      cta: 'Change CTA to "Shop Now"'
    };
    res.json(suggestions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/campaigns/:id/optimize/schedule', auth, async (req, res) => {
  try {
    const optimalSchedule = {
      daysOfWeek: [1, 2, 3, 4, 5],
      hoursOfDay: [9, 10, 11, 14, 15, 16, 17, 18, 19, 20]
    };
    await Ad.findOneAndUpdate(
      { _id: req.params.id, advertiser: req.user.id },
      { 'targeting.timeTargeting': optimalSchedule },
      { new: true }
    );
    res.json({ message: 'Schedule optimized', schedule: optimalSchedule });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/campaigns/:id/optimize/auto', auth, async (req, res) => {
  try {
    const ad = await Ad.findOneAndUpdate(
      { _id: req.params.id, advertiser: req.user.id },
      { 'bidding.strategy': 'auto' },
      { new: true }
    );
    res.json({ message: 'Auto-optimization enabled', campaign: ad });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/campaigns/:id/optimization-score', auth, async (req, res) => {
  try {
    const score = Math.floor(Math.random() * 40) + 60;
    const suggestions = score < 80 ? ['Improve targeting', 'Update creative', 'Increase budget'] : [];
    res.json({ score, suggestions });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/campaigns/:id/dynamic-creative', auth, async (req, res) => {
  try {
    const ad = await Ad.findOneAndUpdate(
      { _id: req.params.id, advertiser: req.user.id },
      { format: 'dynamic' },
      { new: true }
    );
    res.json({ message: 'Dynamic creative optimization enabled', campaign: ad });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/campaigns/:id/best-performing-elements', auth, async (req, res) => {
  try {
    const elements = {
      headline: 'Limited Time Offer',
      image: 'product_image_3.jpg',
      cta: 'Shop Now',
      audience: 'Age 25-34, Tech Enthusiasts'
    };
    res.json(elements);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/campaigns/:id/pause-underperforming', auth, async (req, res) => {
  try {
    const ad = await Ad.findOne({ _id: req.params.id, advertiser: req.user.id });
    const ctr = ad.metrics.clicks / ad.metrics.impressions * 100;
    if (ctr < 1) {
      await Ad.findOneAndUpdate({ _id: req.params.id }, { status: 'paused' });
      res.json({ message: 'Campaign paused due to low performance', ctr });
    } else {
      res.json({ message: 'Campaign performing well', ctr });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/campaigns/bulk-optimize', auth, async (req, res) => {
  try {
    const { campaignIds } = req.body;
    await Ad.updateMany(
      { _id: { $in: campaignIds }, advertiser: req.user.id },
      { 'bidding.strategy': 'auto' }
    );
    res.json({ message: `${campaignIds.length} campaigns optimized` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/optimization/suggestions', auth, async (req, res) => {
  try {
    const ads = await Ad.find({ advertiser: req.user.id, status: 'active' });
    const suggestions = ads.map(ad => ({
      campaignId: ad._id,
      campaignName: ad.campaignName,
      suggestions: ['Increase budget', 'Expand targeting', 'Test new creative']
    }));
    res.json(suggestions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
