const cron = require('node-cron');
const logger = require('../utils/logger');
const emailService = require('../services/emailService');
const pushNotificationService = require('../services/pushNotificationService');
const notificationBatchingService = require('../services/notificationBatchingService');
const dataExportService = require('../services/dataExportService');
const monitoringService = require('../services/monitoringService');

logger.info('🕒 Initializing background jobs...');

cron.schedule('*/2 * * * *', async () => {
  try {
    await emailService.processQueue();
    logger.debug('Email queue processed');
  } catch (error) {
    logger.error('Email queue processing failed:', error);
  }
});

cron.schedule('*/5 * * * *', async () => {
  try {
    await notificationBatchingService.processBatch();
    logger.debug('Notification batching processed');
  } catch (error) {
    logger.error('Notification batching failed:', error);
  }
});

cron.schedule('0 * * * *', async () => {
  try {
    await pushNotificationService.cleanupStaleSubscriptions();
    logger.info('Push subscription cleanup completed');
  } catch (error) {
    logger.error('Push subscription cleanup failed:', error);
  }
});

cron.schedule('0 2 * * *', async () => {
  try {
    await dataExportService.cleanupExpiredExports();
    logger.info('Expired data exports cleaned up');
  } catch (error) {
    logger.error('Data export cleanup failed:', error);
  }
});

cron.schedule('*/5 * * * *', async () => {
  try {
    await monitoringService.collectSystemMetrics();
    logger.debug('System metrics collected');
  } catch (error) {
    logger.error('System metrics collection failed:', error);
  }
});

cron.schedule('0 3 * * *', async () => {
  try {
    const EmbedCache = require('../models/EmbedCache');
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const result = await EmbedCache.deleteMany({
      lastFetched: { $lt: thirtyDaysAgo }
    });

    logger.info(`Cleaned up ${result.deletedCount} stale embed caches`);
  } catch (error) {
    logger.error('Embed cache cleanup failed:', error);
  }
});

cron.schedule('0 0 * * SUN', async () => {
  try {
    const User = require('../models/User');
    const users = await User.find({
      'settings.notifications.email': true
    });

    for (const user of users) {
      const ActivityLog = require('../models/ActivityLog');
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      const activityCount = await ActivityLog.countDocuments({
        user: user._id,
        createdAt: { $gte: weekAgo }
      });

      if (activityCount > 0) {
        await emailService.sendDigest(user._id, {
          weeklyActivity: activityCount
        });
      }
    }

    logger.info('Weekly digest emails sent');
  } catch (error) {
    logger.error('Weekly digest failed:', error);
  }
});

cron.schedule('0 4 * * *', async () => {
  try {
    const feedAlgorithmService = require('../services/feedAlgorithmService');
    const User = require('../models/User');

    const activeUsers = await User.find({
      lastSeen: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    }).limit(100);

    for (const user of activeUsers) {
      await feedAlgorithmService.warmFeedCache(user._id);
    }

    logger.info(`Warmed feed cache for ${activeUsers.length} active users`);
  } catch (error) {
    logger.error('Feed cache warming failed:', error);
  }
});

cron.schedule('0 1 * * *', async () => {
  try {
    const Topic = require('../models/Topic');
    const Post = require('../models/Post');
    const TopicFollower = require('../models/TopicFollower');

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const topics = await Topic.find();

    for (const topic of topics) {
      const postCount = await Post.countDocuments({
        tags: topic._id,
        createdAt: { $gte: oneDayAgo }
      });

      const followerCount = await TopicFollower.countDocuments({
        topic: topic._id
      });

      const engagementScore = postCount * 10 + followerCount;

      topic.trendingScore = engagementScore;
      topic.isTrending = engagementScore > 100;
      topic.postCount = await Post.countDocuments({ tags: topic._id });
      topic.followerCount = followerCount;

      await topic.save();
    }

    logger.info(`Updated trending scores for ${topics.length} topics`);
  } catch (error) {
    logger.error('Topic trending update failed:', error);
  }
});

cron.schedule('*/10 * * * *', async () => {
  try {
    const NotificationDeliveryAttempt = require('../models/NotificationDeliveryAttempt');

    const failedAttempts = await NotificationDeliveryAttempt.find({
      status: 'failed',
      attemptNumber: { $lt: 3 },
      nextRetryAt: { $lte: new Date() }
    }).populate('notification');

    for (const attempt of failedAttempts) {
      if (attempt.channel === 'push') {
        await pushNotificationService.sendPushNotification(
          attempt.notification.recipient,
          attempt.notification
        );
      } else if (attempt.channel === 'email') {
        await emailService.sendEmail({
          to: { userId: attempt.notification.recipient },
          templateKey: 'notification_email',
          variables: {
            title: attempt.notification.title,
            message: attempt.notification.message
          }
        });
      }
    }

    if (failedAttempts.length > 0) {
      logger.info(`Retried ${failedAttempts.length} failed notification deliveries`);
    }
  } catch (error) {
    logger.error('Notification retry failed:', error);
  }
});

cron.schedule('0 5 * * *', async () => {
  try {
    const ParentalControl = require('../models/ParentalControl');

    const controls = await ParentalControl.find({
      'activityReports.enabled': true
    }).populate('childAccount guardianAccount');

    for (const control of controls) {
      const frequency = control.activityReports.frequency;
      const lastSent = control.activityReports.lastSent;

      let shouldSend = false;

      if (frequency === 'daily') {
        shouldSend = true;
      } else if (frequency === 'weekly' && (!lastSent || Date.now() - lastSent > 7 * 24 * 60 * 60 * 1000)) {
        shouldSend = true;
      } else if (frequency === 'monthly' && (!lastSent || Date.now() - lastSent > 30 * 24 * 60 * 60 * 1000)) {
        shouldSend = true;
      }

      if (shouldSend) {
        await emailService.sendEmail({
          to: {
            email: control.guardianAccount.email,
            userId: control.guardianAccount._id
          },
          templateKey: 'parental_activity_report',
          variables: {
            childName: control.childAccount.fullName,
            reportData: {
              alerts: control.alerts.filter(a => !a.acknowledged).length
            }
          }
        });

        control.activityReports.lastSent = new Date();
        await control.save();
      }
    }

    logger.info('Parental control activity reports sent');
  } catch (error) {
    logger.error('Parental control reports failed:', error);
  }
});

logger.info('✅ Background jobs initialized successfully');

module.exports = {
  emailService,
  pushNotificationService,
  notificationBatchingService,
  dataExportService,
  monitoringService
};
