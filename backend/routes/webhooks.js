const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');
const WebhookSubscription = require('../models/WebhookSubscription');
const webhookService = require('../services/webhookService');
const crypto = require('crypto');

router.post('/', auth, validate(schemas.webhookSubscription), async (req, res) => {
  try {
    const secret = crypto.randomBytes(32).toString('hex');

    const webhook = await WebhookSubscription.create({
      owner: req.user.id,
      secret,
      ...req.validatedData
    });

    res.status(201).json({
      ...webhook.toObject(),
      secretHint: `${secret.substring(0, 8)}...`
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/', auth, async (req, res) => {
  try {
    const webhooks = await WebhookSubscription.find({ owner: req.user.id });
    res.json(webhooks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const webhook = await WebhookSubscription.findOne({
      _id: req.params.id,
      owner: req.user.id
    });

    if (!webhook) {
      return res.status(404).json({ error: 'Webhook not found' });
    }

    res.json(webhook);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const webhook = await WebhookSubscription.findOneAndUpdate(
      { _id: req.params.id, owner: req.user.id },
      { $set: req.body },
      { new: true }
    );

    if (!webhook) {
      return res.status(404).json({ error: 'Webhook not found' });
    }

    res.json(webhook);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    await WebhookSubscription.findOneAndDelete({
      _id: req.params.id,
      owner: req.user.id
    });

    res.json({ message: 'Webhook deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/:id/test', auth, async (req, res) => {
  try {
    const result = await webhookService.testWebhook(req.params.id);

    res.json({
      success: result.success,
      message: result.success ? 'Test webhook delivered successfully' : 'Test webhook failed',
      details: result
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id/history', auth, async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;

    const webhook = await WebhookSubscription.findOne({
      _id: req.params.id,
      owner: req.user.id
    });

    if (!webhook) {
      return res.status(404).json({ error: 'Webhook not found' });
    }

    const history = webhook.deliveryHistory
      .sort((a, b) => b.deliveredAt - a.deliveredAt)
      .slice((page - 1) * limit, page * limit);

    res.json({
      history,
      stats: webhook.stats,
      page: parseInt(page),
      hasMore: webhook.deliveryHistory.length > page * limit
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/:id/regenerate-secret', auth, async (req, res) => {
  try {
    const webhook = await WebhookSubscription.findOne({
      _id: req.params.id,
      owner: req.user.id
    });

    if (!webhook) {
      return res.status(404).json({ error: 'Webhook not found' });
    }

    webhook.secret = crypto.randomBytes(32).toString('hex');
    await webhook.save();

    res.json({
      message: 'Secret regenerated',
      secretHint: `${webhook.secret.substring(0, 8)}...`
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
