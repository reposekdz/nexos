const express = require('express');
const router = express.Router();
const Ad = require('../models/Ad');
const Audience = require('../models/Audience');
const { Monetization } = require('../models/Monetization');
const auth = require('../middleware/auth');

// Campaign Management (15 APIs)
router.post('/campaigns', auth, async (req, res) => {
  try {
    const ad = new Ad({ ...req.body, advertiser: req.user.id });
    await ad.save();
    res.json(ad);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/campaigns', auth, async (req, res) => {
  try {
    const ads = await Ad.find({ advertiser: req.user.id }).sort('-createdAt');
    res.json(ads);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/campaigns/:id', auth, async (req, res) => {
  try {
    const ad = await Ad.findOne({ _id: req.params.id, advertiser: req.user.id });
    res.json(ad);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/campaigns/:id', auth, async (req, res) => {
  try {
    const ad = await Ad.findOneAndUpdate(
      { _id: req.params.id, advertiser: req.user.id },
      req.body,
      { new: true }
    );
    res.json(ad);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/campaigns/:id', auth, async (req, res) => {
  try {
    await Ad.findOneAndDelete({ _id: req.params.id, advertiser: req.user.id });
    res.json({ message: 'Campaign deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/campaigns/:id/duplicate', auth, async (req, res) => {
  try {
    const original = await Ad.findOne({ _id: req.params.id, advertiser: req.user.id });
    const duplicate = new Ad({ ...original.toObject(), _id: undefined, campaignName: `${original.campaignName} (Copy)`, status: 'draft' });
    await duplicate.save();
    res.json(duplicate);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/campaigns/:id/pause', auth, async (req, res) => {
  try {
    const ad = await Ad.findOneAndUpdate(
      { _id: req.params.id, advertiser: req.user.id },
      { status: 'paused', 'schedule.isActive': false },
      { new: true }
    );
    res.json(ad);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/campaigns/:id/resume', auth, async (req, res) => {
  try {
    const ad = await Ad.findOneAndUpdate(
      { _id: req.params.id, advertiser: req.user.id },
      { status: 'active', 'schedule.isActive': true },
      { new: true }
    );
    res.json(ad);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/campaigns/:id/submit', auth, async (req, res) => {
  try {
    const ad = await Ad.findOneAndUpdate(
      { _id: req.params.id, advertiser: req.user.id },
      { status: 'pending' },
      { new: true }
    );
    res.json(ad);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/campaigns/:id/preview', auth, async (req, res) => {
  try {
    const ad = await Ad.findOne({ _id: req.params.id, advertiser: req.user.id });
    res.json({ preview: ad.creative, format: ad.format });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/campaigns/bulk-action', auth, async (req, res) => {
  try {
    const { campaignIds, action } = req.body;
    const update = action === 'pause' ? { status: 'paused' } : action === 'resume' ? { status: 'active' } : {};
    await Ad.updateMany({ _id: { $in: campaignIds }, advertiser: req.user.id }, update);
    res.json({ message: `${action} applied to ${campaignIds.length} campaigns` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/campaigns/:id/history', auth, async (req, res) => {
  try {
    const ad = await Ad.findOne({ _id: req.params.id, advertiser: req.user.id });
    res.json({ history: ad.abTest?.variants || [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/campaigns/:id/schedule', auth, async (req, res) => {
  try {
    const ad = await Ad.findOneAndUpdate(
      { _id: req.params.id, advertiser: req.user.id },
      { schedule: req.body },
      { new: true }
    );
    res.json(ad);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/campaigns/status/:status', auth, async (req, res) => {
  try {
    const ads = await Ad.find({ advertiser: req.user.id, status: req.params.status });
    res.json(ads);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/campaigns/:id/budget', auth, async (req, res) => {
  try {
    const ad = await Ad.findOneAndUpdate(
      { _id: req.params.id, advertiser: req.user.id },
      { budget: req.body },
      { new: true }
    );
    res.json(ad);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Ad Formats (8 APIs)
router.post('/formats/image', auth, async (req, res) => {
  try {
    const ad = new Ad({ ...req.body, format: 'image', advertiser: req.user.id });
    await ad.save();
    res.json(ad);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/formats/video', auth, async (req, res) => {
  try {
    const ad = new Ad({ ...req.body, format: 'video', advertiser: req.user.id });
    await ad.save();
    res.json(ad);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/formats/carousel', auth, async (req, res) => {
  try {
    const ad = new Ad({ ...req.body, format: 'carousel', advertiser: req.user.id });
    await ad.save();
    res.json(ad);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/formats/stories', auth, async (req, res) => {
  try {
    const ad = new Ad({ ...req.body, format: 'stories', advertiser: req.user.id });
    await ad.save();
    res.json(ad);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/formats/sponsored-post', auth, async (req, res) => {
  try {
    const ad = new Ad({ ...req.body, format: 'sponsored_post', advertiser: req.user.id });
    await ad.save();
    res.json(ad);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/formats/in-stream', auth, async (req, res) => {
  try {
    const ad = new Ad({ ...req.body, format: 'in_stream', advertiser: req.user.id });
    await ad.save();
    res.json(ad);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/formats/collection', auth, async (req, res) => {
  try {
    const ad = new Ad({ ...req.body, format: 'collection', advertiser: req.user.id });
    await ad.save();
    res.json(ad);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/formats/dynamic', auth, async (req, res) => {
  try {
    const ad = new Ad({ ...req.body, format: 'dynamic', advertiser: req.user.id });
    await ad.save();
    res.json(ad);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Targeting (12 APIs)
router.post('/campaigns/:id/targeting/demographics', auth, async (req, res) => {
  try {
    const ad = await Ad.findOneAndUpdate(
      { _id: req.params.id, advertiser: req.user.id },
      { 'targeting.demographics': req.body },
      { new: true }
    );
    res.json(ad);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/campaigns/:id/targeting/geographic', auth, async (req, res) => {
  try {
    const ad = await Ad.findOneAndUpdate(
      { _id: req.params.id, advertiser: req.user.id },
      { 'targeting.geographic': req.body },
      { new: true }
    );
    res.json(ad);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/campaigns/:id/targeting/behavioral', auth, async (req, res) => {
  try {
    const ad = await Ad.findOneAndUpdate(
      { _id: req.params.id, advertiser: req.user.id },
      { 'targeting.behavioral': req.body },
      { new: true }
    );
    res.json(ad);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/campaigns/:id/targeting/interests', auth, async (req, res) => {
  try {
    const ad = await Ad.findOneAndUpdate(
      { _id: req.params.id, advertiser: req.user.id },
      { 'targeting.behavioral.interests': req.body.interests },
      { new: true }
    );
    res.json(ad);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/campaigns/:id/targeting/devices', auth, async (req, res) => {
  try {
    const ad = await Ad.findOneAndUpdate(
      { _id: req.params.id, advertiser: req.user.id },
      { 'targeting.devices': req.body.devices, 'targeting.os': req.body.os },
      { new: true }
    );
    res.json(ad);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/campaigns/:id/targeting/time', auth, async (req, res) => {
  try {
    const ad = await Ad.findOneAndUpdate(
      { _id: req.params.id, advertiser: req.user.id },
      { 'targeting.timeTargeting': req.body },
      { new: true }
    );
    res.json(ad);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/campaigns/:id/targeting/retargeting', auth, async (req, res) => {
  try {
    const ad = await Ad.findOneAndUpdate(
      { _id: req.params.id, advertiser: req.user.id },
      { 'targeting.retargeting': req.body },
      { new: true }
    );
    res.json(ad);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/targeting/interests/suggestions', auth, async (req, res) => {
  try {
    const suggestions = ['Technology', 'Fashion', 'Sports', 'Travel', 'Food', 'Music', 'Gaming', 'Fitness', 'Business', 'Education'];
    res.json(suggestions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/targeting/locations/search', auth, async (req, res) => {
  try {
    const { query } = req.query;
    const locations = [{ name: query, type: 'city' }];
    res.json(locations);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/campaigns/:id/targeting/audience-size', auth, async (req, res) => {
  try {
    const estimatedSize = Math.floor(Math.random() * 1000000) + 10000;
    res.json({ estimatedSize, reach: estimatedSize * 0.3 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/campaigns/:id/targeting', auth, async (req, res) => {
  try {
    const ad = await Ad.findOne({ _id: req.params.id, advertiser: req.user.id });
    res.json(ad.targeting);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/campaigns/:id/targeting', auth, async (req, res) => {
  try {
    const ad = await Ad.findOneAndUpdate(
      { _id: req.params.id, advertiser: req.user.id },
      { targeting: {} },
      { new: true }
    );
    res.json(ad);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Audiences (10 APIs)
router.post('/audiences', auth, async (req, res) => {
  try {
    const audience = new Audience({ ...req.body, advertiser: req.user.id });
    await audience.save();
    res.json(audience);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/audiences', auth, async (req, res) => {
  try {
    const audiences = await Audience.find({ advertiser: req.user.id });
    res.json(audiences);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/audiences/:id', auth, async (req, res) => {
  try {
    const audience = await Audience.findOne({ _id: req.params.id, advertiser: req.user.id });
    res.json(audience);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/audiences/:id', auth, async (req, res) => {
  try {
    const audience = await Audience.findOneAndUpdate(
      { _id: req.params.id, advertiser: req.user.id },
      req.body,
      { new: true }
    );
    res.json(audience);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/audiences/:id', auth, async (req, res) => {
  try {
    await Audience.findOneAndDelete({ _id: req.params.id, advertiser: req.user.id });
    res.json({ message: 'Audience deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/audiences/custom', auth, async (req, res) => {
  try {
    const audience = new Audience({ ...req.body, type: 'custom', advertiser: req.user.id });
    await audience.save();
    res.json(audience);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/audiences/lookalike', auth, async (req, res) => {
  try {
    const audience = new Audience({ ...req.body, type: 'lookalike', advertiser: req.user.id });
    await audience.save();
    res.json(audience);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/audiences/:id/upload', auth, async (req, res) => {
  try {
    const audience = await Audience.findOneAndUpdate(
      { _id: req.params.id, advertiser: req.user.id },
      { 'source.data': req.body.data, size: req.body.data.length },
      { new: true }
    );
    res.json(audience);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/audiences/:id/size', auth, async (req, res) => {
  try {
    const audience = await Audience.findOne({ _id: req.params.id, advertiser: req.user.id });
    res.json({ size: audience.size });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/audiences/:id/refresh', auth, async (req, res) => {
  try {
    const audience = await Audience.findOneAndUpdate(
      { _id: req.params.id, advertiser: req.user.id },
      { lastUpdated: Date.now() },
      { new: true }
    );
    res.json(audience);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
