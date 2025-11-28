const webpush = require('web-push');
const PushSubscription = require('../models/PushSubscription');
const NotificationDeliveryAttempt = require('../models/NotificationDeliveryAttempt');
const logger = require('../utils/logger');

webpush.setVapidDetails(
  `mailto:${process.env.VAPID_EMAIL}`,
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

class PushNotificationService {
  async sendPushNotification(userId, notification) {
    try {
      const subscriptions = await PushSubscription.find({
        user: userId,
        isActive: true
      });

      if (subscriptions.length === 0) {
        return { success: false, reason: 'No active subscriptions' };
      }

      const payload = JSON.stringify({
        title: notification.title,
        body: notification.message,
        icon: notification.icon || '/default-icon.png',
        badge: notification.badge || '/badge-icon.png',
        data: notification.data || {},
        tag: notification.tag || 'default',
        requireInteraction: notification.priority === 'urgent',
        timestamp: Date.now()
      });

      const results = [];

      for (const subscription of subscriptions) {
        try {
          const pushSubscription = {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.keys.p256dh,
              auth: subscription.keys.auth
            }
          };

          await webpush.sendNotification(pushSubscription, payload);

          subscription.lastUsed = new Date();
          subscription.failureCount = 0;
          await subscription.save();

          await NotificationDeliveryAttempt.create({
            notification: notification._id,
            channel: 'push',
            status: 'sent',
            attemptNumber: 1,
            deliveredAt: new Date(),
            provider: 'web-push'
          });

          results.push({ subscriptionId: subscription._id, success: true });
        } catch (error) {
          subscription.failureCount += 1;
          subscription.lastFailure = new Date();

          if (subscription.failureCount >= 5 || error.statusCode === 410) {
            subscription.isActive = false;
          }
          await subscription.save();

          await NotificationDeliveryAttempt.create({
            notification: notification._id,
            channel: 'push',
            status: 'failed',
            attemptNumber: 1,
            error: {
              code: error.statusCode?.toString(),
              message: error.message
            },
            provider: 'web-push'
          });

          results.push({ 
            subscriptionId: subscription._id, 
            success: false, 
            error: error.message 
          });
        }
      }

      return {
        success: results.some(r => r.success),
        results
      };
    } catch (error) {
      logger.error('Push notification error:', error);
      throw error;
    }
  }

  async subscribe(userId, subscription, deviceInfo) {
    try {
      const existing = await PushSubscription.findOne({
        endpoint: subscription.endpoint
      });

      if (existing) {
        existing.user = userId;
        existing.keys = subscription.keys;
        existing.deviceInfo = deviceInfo;
        existing.isActive = true;
        existing.lastUsed = new Date();
        await existing.save();
        return existing;
      }

      const newSubscription = await PushSubscription.create({
        user: userId,
        endpoint: subscription.endpoint,
        keys: subscription.keys,
        deviceType: deviceInfo.type || 'web',
        browser: deviceInfo.browser,
        deviceInfo: deviceInfo,
        isActive: true
      });

      return newSubscription;
    } catch (error) {
      logger.error('Push subscription error:', error);
      throw error;
    }
  }

  async unsubscribe(userId, endpoint) {
    try {
      const subscription = await PushSubscription.findOne({
        user: userId,
        endpoint
      });

      if (subscription) {
        subscription.isActive = false;
        await subscription.save();
      }

      return true;
    } catch (error) {
      logger.error('Push unsubscribe error:', error);
      throw error;
    }
  }

  async cleanupStaleSubscriptions() {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      const result = await PushSubscription.updateMany(
        {
          $or: [
            { failureCount: { $gte: 5 } },
            { lastUsed: { $lt: thirtyDaysAgo }, isActive: true }
          ]
        },
        {
          $set: { isActive: false }
        }
      );

      logger.info(`Cleaned up ${result.modifiedCount} stale push subscriptions`);
      return result.modifiedCount;
    } catch (error) {
      logger.error('Push subscription cleanup error:', error);
      throw error;
    }
  }

  async updatePreferences(userId, preferences) {
    try {
      await PushSubscription.updateMany(
        { user: userId },
        { $set: { preferences } }
      );
      return true;
    } catch (error) {
      logger.error('Push preferences update error:', error);
      throw error;
    }
  }
}

module.exports = new PushNotificationService();
