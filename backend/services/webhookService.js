const WebhookSubscription = require('../models/WebhookSubscription');
const logger = require('../utils/logger');
const crypto = require('crypto');
const axios = require('axios');

class WebhookService {
  async triggerWebhook(eventType, payload, userId) {
    try {
      const subscriptions = await WebhookSubscription.find({
        owner: userId,
        isActive: true,
        events: eventType
      });

      const results = [];

      for (const subscription of subscriptions) {
        const result = await this.deliverWebhook(subscription, eventType, payload);
        results.push({
          subscriptionId: subscription._id,
          success: result.success
        });
      }

      return results;
    } catch (error) {
      logger.error('Webhook trigger error:', error);
      throw error;
    }
  }

  async deliverWebhook(subscription, eventType, payload, attempt = 1) {
    const startTime = Date.now();

    try {
      if (!this.checkRateLimit(subscription)) {
        throw new Error('Rate limit exceeded');
      }

      const webhookPayload = {
        event: eventType,
        timestamp: new Date().toISOString(),
        data: payload
      };

      const signature = this.generateSignature(
        JSON.stringify(webhookPayload),
        subscription.secret
      );

      const response = await axios.post(subscription.url, webhookPayload, {
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature,
          'X-Webhook-Event': eventType,
          'User-Agent': 'Nexos-Webhooks/1.0'
        },
        timeout: subscription.deliveryConfig.timeout
      });

      subscription.stats.totalDeliveries += 1;
      subscription.stats.successfulDeliveries += 1;
      subscription.stats.lastDeliveryAt = new Date();
      subscription.stats.lastSuccessAt = new Date();

      subscription.deliveryHistory.push({
        eventType,
        payload: webhookPayload,
        status: 'success',
        responseCode: response.status,
        responseBody: JSON.stringify(response.data).substring(0, 1000),
        attempt,
        deliveredAt: new Date()
      });

      if (subscription.deliveryHistory.length > 100) {
        subscription.deliveryHistory = subscription.deliveryHistory.slice(-100);
      }

      await subscription.save();

      logger.info(`Webhook delivered successfully to ${subscription.url} in ${Date.now() - startTime}ms`);

      return { success: true, responseCode: response.status };
    } catch (error) {
      subscription.stats.totalDeliveries += 1;
      subscription.stats.failedDeliveries += 1;
      subscription.stats.lastDeliveryAt = new Date();
      subscription.stats.lastFailureAt = new Date();

      subscription.deliveryHistory.push({
        eventType,
        payload: webhookPayload || payload,
        status: 'failure',
        responseCode: error.response?.status,
        attempt,
        deliveredAt: new Date(),
        error: error.message
      });

      await subscription.save();

      if (attempt < subscription.deliveryConfig.retryAttempts) {
        logger.info(`Retrying webhook delivery, attempt ${attempt + 1}`);
        await new Promise(resolve => 
          setTimeout(resolve, subscription.deliveryConfig.retryDelay * attempt)
        );
        return this.deliverWebhook(subscription, eventType, payload, attempt + 1);
      }

      logger.error(`Webhook delivery failed after ${attempt} attempts: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  generateSignature(payload, secret) {
    return crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
  }

  verifySignature(payload, signature, secret) {
    const expectedSignature = this.generateSignature(payload, secret);
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }

  checkRateLimit(subscription) {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    const oneHourAgo = now - 3600000;

    const recentDeliveries = subscription.deliveryHistory.filter(
      h => h.deliveredAt > oneMinuteAgo
    );

    if (recentDeliveries.length >= subscription.rateLimit.maxPerMinute) {
      return false;
    }

    const hourlyDeliveries = subscription.deliveryHistory.filter(
      h => h.deliveredAt > oneHourAgo
    );

    return hourlyDeliveries.length < subscription.rateLimit.maxPerHour;
  }

  async testWebhook(subscriptionId) {
    try {
      const subscription = await WebhookSubscription.findById(subscriptionId);
      if (!subscription) {
        throw new Error('Subscription not found');
      }

      const testPayload = {
        test: true,
        message: 'This is a test webhook delivery',
        timestamp: new Date()
      };

      const result = await this.deliverWebhook(
        subscription,
        'webhook.test',
        testPayload
      );

      return result;
    } catch (error) {
      logger.error('Webhook test error:', error);
      throw error;
    }
  }
}

module.exports = new WebhookService();
