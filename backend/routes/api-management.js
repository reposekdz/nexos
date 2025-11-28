const express = require('express');
const crypto = require('crypto');
const {
  Webhook,
  WebhookDeliveryLog,
  ApiKey,
  ApiUsage,
  ServiceAccount,
  IdempotencyKey,
  ApiContract,
  ApiDeprecation,
  RateLimitRule,
  CircuitBreaker
} = require('../models/APIManagement');
const { FlagExposure } = require('../models/AdvancedSecurity');
const { FeatureFlag } = require('../models/Experiment');
const auth = require('../middleware/auth');
const router = express.Router();

router.post('/webhooks', auth, async (req, res) => {
  try {
    const secret = crypto.randomBytes(32).toString('hex');
    
    const webhook = new Webhook({
      userId: req.userId,
      ...req.body,
      secret
    });
    
    await webhook.save();
    res.status(201).json({ webhook, secret });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/webhooks', auth, async (req, res) => {
  try {
    const webhooks = await Webhook.find({ userId: req.userId });
    res.json(webhooks);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/webhooks/:id', auth, async (req, res) => {
  try {
    const webhook = await Webhook.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      req.body,
      { new: true }
    );
    
    if (!webhook) {
      return res.status(404).json({ message: 'Webhook not found' });
    }
    
    res.json(webhook);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.delete('/webhooks/:id', auth, async (req, res) => {
  try {
    await Webhook.findOneAndDelete({ _id: req.params.id, userId: req.userId });
    res.json({ message: 'Webhook deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/webhooks/deliver', async (req, res) => {
  try {
    const { webhookId, event, payload } = req.body;
    
    const webhook = await Webhook.findById(webhookId);
    if (!webhook || !webhook.enabled) {
      return res.status(404).json({ message: 'Webhook not found or disabled' });
    }
    
    if (!webhook.events.includes(event)) {
      return res.status(400).json({ message: 'Event not subscribed' });
    }
    
    const timestamp = Date.now();
    const nonce = crypto.randomBytes(16).toString('hex');
    const dataToSign = `${timestamp}.${nonce}.${JSON.stringify(payload)}`;
    const signature = crypto.createHmac('sha256', webhook.secret)
      .update(dataToSign)
      .digest('hex');
    
    const delivery = new WebhookDeliveryLog({
      webhookId: webhook._id,
      endpoint: webhook.url,
      event,
      payload,
      signature,
      timestamp: new Date(timestamp),
      nonce
    });
    
    await delivery.save();
    
    res.json({ deliveryId: delivery._id, signature, timestamp, nonce });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/webhooks/:id/deliveries', auth, async (req, res) => {
  try {
    const webhook = await Webhook.findOne({ _id: req.params.id, userId: req.userId });
    if (!webhook) {
      return res.status(404).json({ message: 'Webhook not found' });
    }
    
    const deliveries = await WebhookDeliveryLog.find({ webhookId: webhook._id })
      .sort({ createdAt: -1 })
      .limit(100);
    
    res.json(deliveries);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/webhooks/:id/replay/:deliveryId', auth, async (req, res) => {
  try {
    const webhook = await Webhook.findOne({ _id: req.params.id, userId: req.userId });
    if (!webhook) {
      return res.status(404).json({ message: 'Webhook not found' });
    }
    
    const originalDelivery = await WebhookDeliveryLog.findById(req.params.deliveryId);
    if (!originalDelivery) {
      return res.status(404).json({ message: 'Delivery not found' });
    }
    
    const timestamp = Date.now();
    const nonce = crypto.randomBytes(16).toString('hex');
    const dataToSign = `${timestamp}.${nonce}.${JSON.stringify(originalDelivery.payload)}`;
    const signature = crypto.createHmac('sha256', webhook.secret)
      .update(dataToSign)
      .digest('hex');
    
    const newDelivery = new WebhookDeliveryLog({
      webhookId: webhook._id,
      endpoint: webhook.url,
      event: originalDelivery.event,
      payload: originalDelivery.payload,
      signature,
      timestamp: new Date(timestamp),
      nonce,
      attempt: 1
    });
    
    await newDelivery.save();
    
    res.json({ deliveryId: newDelivery._id, message: 'Webhook replayed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/api-keys', auth, async (req, res) => {
  try {
    const key = `nxs_${crypto.randomBytes(32).toString('hex')}`;
    const keyHash = crypto.createHash('sha256').update(key).digest('hex');
    const keyPrefix = key.substring(0, 12);
    
    const apiKey = new ApiKey({
      userId: req.userId,
      name: req.body.name,
      keyHash,
      keyPrefix,
      scopes: req.body.scopes || [],
      rateLimit: req.body.rateLimit,
      ipWhitelist: req.body.ipWhitelist,
      allowedOrigins: req.body.allowedOrigins,
      expiresAt: req.body.expiresAt,
      metadata: req.body.metadata
    });
    
    await apiKey.save();
    
    res.status(201).json({ 
      apiKey: {
        id: apiKey._id,
        name: apiKey.name,
        keyPrefix: apiKey.keyPrefix,
        scopes: apiKey.scopes,
        createdAt: apiKey.createdAt
      },
      key
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/api-keys', auth, async (req, res) => {
  try {
    const apiKeys = await ApiKey.find({ 
      userId: req.userId,
      enabled: true 
    }).select('-keyHash');
    
    res.json(apiKeys);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.delete('/api-keys/:id', auth, async (req, res) => {
  try {
    await ApiKey.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      { enabled: false }
    );
    
    res.json({ message: 'API key revoked' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/api-keys/:id/usage', auth, async (req, res) => {
  try {
    const apiKey = await ApiKey.findOne({ _id: req.params.id, userId: req.userId });
    if (!apiKey) {
      return res.status(404).json({ message: 'API key not found' });
    }
    
    const { from, to } = req.query;
    const filter = { apiKeyId: apiKey._id };
    
    if (from || to) {
      filter.timestamp = {};
      if (from) filter.timestamp.$gte = new Date(from);
      if (to) filter.timestamp.$lte = new Date(to);
    }
    
    const usage = await ApiUsage.find(filter)
      .sort({ timestamp: -1 })
      .limit(1000);
    
    const stats = await ApiUsage.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalRequests: { $sum: 1 },
          totalErrors: { $sum: { $cond: [{ $gte: ['$statusCode', 400] }, 1, 0] } },
          avgDuration: { $avg: '$duration' },
          totalSize: { $sum: { $add: ['$requestSize', '$responseSize'] } }
        }
      }
    ]);
    
    res.json({ usage, stats: stats[0] || {} });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/service-accounts', auth, async (req, res) => {
  try {
    const clientId = `sa_${crypto.randomBytes(16).toString('hex')}`;
    const clientSecret = crypto.randomBytes(32).toString('hex');
    const clientSecretHash = crypto.createHash('sha256').update(clientSecret).digest('hex');
    
    const account = new ServiceAccount({
      name: req.body.name,
      description: req.body.description,
      clientId,
      clientSecretHash,
      scopes: req.body.scopes || [],
      permissions: req.body.permissions,
      rateLimit: req.body.rateLimit,
      ipWhitelist: req.body.ipWhitelist,
      expiresAt: req.body.expiresAt,
      createdBy: req.userId,
      metadata: req.body.metadata
    });
    
    await account.save();
    
    res.status(201).json({ 
      account: {
        id: account._id,
        name: account.name,
        clientId: account.clientId,
        scopes: account.scopes
      },
      clientSecret
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/service-accounts', auth, async (req, res) => {
  try {
    const accounts = await ServiceAccount.find({ 
      createdBy: req.userId,
      enabled: true 
    }).select('-clientSecretHash');
    
    res.json(accounts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/idempotency', async (req, res) => {
  try {
    const { key, endpoint, method, requestBody } = req.body;
    
    const requestHash = crypto.createHash('sha256')
      .update(JSON.stringify(requestBody))
      .digest('hex');
    
    const existing = await IdempotencyKey.findOne({ key });
    
    if (existing) {
      if (existing.requestHash !== requestHash) {
        return res.status(409).json({ 
          message: 'Idempotency key conflict',
          error: 'Different request body with same key'
        });
      }
      
      return res.status(200).json({
        cached: true,
        statusCode: existing.statusCode,
        response: existing.response
      });
    }
    
    const idempotencyKey = new IdempotencyKey({
      key,
      endpoint,
      method,
      requestHash,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
    });
    
    await idempotencyKey.save();
    
    res.json({ cached: false, idempotencyKey: idempotencyKey._id });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/contracts', auth, async (req, res) => {
  try {
    const contract = new ApiContract(req.body);
    await contract.save();
    res.status(201).json(contract);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/contracts', async (req, res) => {
  try {
    const contracts = await ApiContract.find({ enabled: true })
      .sort({ createdAt: -1 });
    res.json(contracts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/deprecations', auth, async (req, res) => {
  try {
    const deprecation = new ApiDeprecation(req.body);
    await deprecation.save();
    res.status(201).json(deprecation);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/deprecations', async (req, res) => {
  try {
    const deprecations = await ApiDeprecation.find({
      sunsetDate: { $gte: new Date() }
    }).sort({ sunsetDate: 1 });
    
    res.json(deprecations);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/rate-limits', auth, async (req, res) => {
  try {
    const rule = new RateLimitRule(req.body);
    await rule.save();
    res.status(201).json(rule);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/rate-limits', async (req, res) => {
  try {
    const rules = await RateLimitRule.find({ enabled: true })
      .sort({ priority: -1 });
    res.json(rules);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/circuit-breakers', auth, async (req, res) => {
  try {
    const breaker = new CircuitBreaker(req.body);
    await breaker.save();
    res.status(201).json(breaker);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/circuit-breakers', async (req, res) => {
  try {
    const breakers = await CircuitBreaker.find();
    res.json(breakers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/circuit-breakers/:name/trip', async (req, res) => {
  try {
    const breaker = await CircuitBreaker.findOne({ name: req.params.name });
    if (!breaker) {
      return res.status(404).json({ message: 'Circuit breaker not found' });
    }
    
    breaker.consecutiveFailures++;
    breaker.failedCalls++;
    breaker.lastFailureAt = new Date();
    
    if (breaker.consecutiveFailures >= breaker.failureThreshold && breaker.state === 'closed') {
      breaker.state = 'open';
      breaker.nextAttemptAt = new Date(Date.now() + breaker.timeout);
      breaker.history.push({
        state: 'open',
        timestamp: new Date(),
        reason: 'Failure threshold exceeded'
      });
    }
    
    await breaker.save();
    res.json(breaker);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/circuit-breakers/:name/success', async (req, res) => {
  try {
    const breaker = await CircuitBreaker.findOne({ name: req.params.name });
    if (!breaker) {
      return res.status(404).json({ message: 'Circuit breaker not found' });
    }
    
    breaker.consecutiveSuccesses++;
    breaker.successfulCalls++;
    breaker.consecutiveFailures = 0;
    breaker.lastSuccessAt = new Date();
    
    if (breaker.state === 'half_open' && breaker.consecutiveSuccesses >= breaker.successThreshold) {
      breaker.state = 'closed';
      breaker.history.push({
        state: 'closed',
        timestamp: new Date(),
        reason: 'Success threshold met'
      });
    }
    
    await breaker.save();
    res.json(breaker);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/flags/:flagId/expose', async (req, res) => {
  try {
    const { userId, userHash, variant, enabled, context } = req.body;
    
    const exposure = new FlagExposure({
      flagId: req.params.flagId,
      userId,
      userHash,
      variant,
      enabled,
      context
    });
    
    await exposure.save();
    res.status(201).json(exposure);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/flags/:flagId/exposures', async (req, res) => {
  try {
    const { from, to } = req.query;
    const filter = { flagId: req.params.flagId };
    
    if (from || to) {
      filter.timestamp = {};
      if (from) filter.timestamp.$gte = new Date(from);
      if (to) filter.timestamp.$lte = new Date(to);
    }
    
    const exposures = await FlagExposure.find(filter)
      .sort({ timestamp: -1 })
      .limit(10000);
    
    const analytics = await FlagExposure.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$variant',
          count: { $sum: 1 },
          uniqueUsers: { $addToSet: '$userHash' },
          avgPerformance: { $avg: '$performance.latency' },
          errorCount: { $sum: { $size: { $ifNull: ['$performance.errors', []] } } }
        }
      }
    ]);
    
    res.json({ exposures, analytics });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
