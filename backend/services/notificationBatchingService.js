const Notification = require('../models/Notification');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

class NotificationBatchingService {
  constructor() {
    this.batchWindow = 5 * 60 * 1000;
    this.pendingBatches = new Map();
  }

  async groupNotifications(userId, timeWindow = this.batchWindow) {
    try {
      const since = new Date(Date.now() - timeWindow);

      const notifications = await Notification.find({
        recipient: userId,
        createdAt: { $gte: since },
        isGrouped: false
      }).sort({ createdAt: -1 });

      const groups = {};

      notifications.forEach(notif => {
        const key = this.getGroupingKey(notif);
        if (!groups[key]) {
          groups[key] = [];
        }
        groups[key].push(notif);
      });

      const batched = [];

      for (const [key, items] of Object.entries(groups)) {
        if (items.length > 1) {
          const batchId = uuidv4();
          const primary = items[0];

          const grouped = await Notification.create({
            recipient: userId,
            type: primary.type,
            title: this.generateGroupedTitle(items),
            message: this.generateGroupedMessage(items),
            data: primary.data,
            priority: primary.priority,
            batchId,
            isGrouped: true,
            groupCount: items.length,
            groupedWith: items.map(i => i._id)
          });

          await Notification.updateMany(
            { _id: { $in: items.map(i => i._id) } },
            { $set: { isGrouped: true, batchId } }
          );

          batched.push(grouped);
        }
      }

      return batched;
    } catch (error) {
      logger.error('Notification grouping error:', error);
      throw error;
    }
  }

  getGroupingKey(notification) {
    switch (notification.type) {
      case 'like':
        return `like_${notification.data.postId}`;
      case 'comment':
        return `comment_${notification.data.postId}`;
      case 'follow':
        return 'follow_general';
      default:
        return `${notification.type}_general`;
    }
  }

  generateGroupedTitle(notifications) {
    const type = notifications[0].type;
    const count = notifications.length;

    switch (type) {
      case 'like':
        return `${count} people liked your post`;
      case 'comment':
        return `${count} new comments on your post`;
      case 'follow':
        return `${count} people started following you`;
      default:
        return `${count} new ${type} notifications`;
    }
  }

  generateGroupedMessage(notifications) {
    const senders = notifications
      .slice(0, 3)
      .map(n => n.sender?.username || 'Someone')
      .join(', ');

    const remaining = notifications.length - 3;

    if (remaining > 0) {
      return `${senders} and ${remaining} others`;
    }

    return senders;
  }

  async scheduleBatch(userId) {
    if (this.pendingBatches.has(userId)) {
      clearTimeout(this.pendingBatches.get(userId));
    }

    const timer = setTimeout(async () => {
      await this.groupNotifications(userId);
      this.pendingBatches.delete(userId);
    }, this.batchWindow);

    this.pendingBatches.set(userId, timer);
  }

  async processBatch() {
    try {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

      const recentNotifs = await Notification.aggregate([
        {
          $match: {
            createdAt: { $gte: fiveMinutesAgo },
            isGrouped: false
          }
        },
        {
          $group: {
            _id: '$recipient',
            count: { $sum: 1 }
          }
        },
        {
          $match: { count: { $gte: 2 } }
        }
      ]);

      for (const { _id: userId } of recentNotifs) {
        await this.groupNotifications(userId);
      }

      logger.info(`Processed batching for ${recentNotifs.length} users`);
    } catch (error) {
      logger.error('Batch processing error:', error);
    }
  }
}

module.exports = new NotificationBatchingService();
