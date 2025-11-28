const DataExportJob = require('../models/DataExportJob');
const User = require('../models/User');
const Post = require('../models/Post');
const Message = require('../models/Message');
const ActivityLog = require('../models/ActivityLog');
const logger = require('../utils/logger');
const fs = require('fs').promises;
const path = require('path');
const archiver = require('archiver');
const crypto = require('crypto');

class DataExportService {
  async createExportJob(userId, exportType = 'gdpr_full', options = {}) {
    try {
      const existingPending = await DataExportJob.findOne({
        user: userId,
        status: { $in: ['pending', 'processing'] }
      });

      if (existingPending) {
        throw new Error('An export is already in progress');
      }

      const job = await DataExportJob.create({
        user: userId,
        exportType,
        format: options.format || 'zip',
        includeData: options.includeData || {},
        dateRange: options.dateRange,
        status: 'pending',
        downloadToken: crypto.randomBytes(32).toString('hex'),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      });

      this.processExport(job._id);

      return job;
    } catch (error) {
      logger.error('Export job creation error:', error);
      throw error;
    }
  }

  async processExport(jobId) {
    let job;
    try {
      job = await DataExportJob.findById(jobId);
      if (!job) return;

      job.status = 'processing';
      job.processingStartedAt = new Date();
      await job.save();

      const exportData = await this.gatherUserData(job);
      const filePath = await this.createExportFile(job, exportData);

      const stats = await fs.stat(filePath);

      job.status = 'completed';
      job.filePath = filePath;
      job.fileUrl = `/exports/${path.basename(filePath)}`;
      job.fileSize = stats.size;
      job.completedAt = new Date();
      await job.save();

      await this.sendExportNotification(job);

      logger.info(`Export job ${jobId} completed successfully`);
    } catch (error) {
      if (job) {
        job.status = 'failed';
        job.error = error.message;
        await job.save();
      }
      logger.error('Export processing error:', error);
    }
  }

  async gatherUserData(job) {
    const data = {};
    const { user, includeData, dateRange } = job;

    const dateFilter = dateRange ? {
      createdAt: {
        $gte: new Date(dateRange.from),
        $lte: new Date(dateRange.to)
      }
    } : {};

    if (includeData.profile !== false) {
      const userData = await User.findById(user).lean();
      delete userData.password;
      delete userData.twoFactorSecret;
      data.profile = userData;
    }

    if (includeData.posts !== false) {
      data.posts = await Post.find({ 
        author: user,
        ...dateFilter
      }).lean();
    }

    if (includeData.messages !== false) {
      data.messages = await Message.find({
        $or: [{ sender: user }, { recipient: user }],
        ...dateFilter
      }).lean();
    }

    if (includeData.activity !== false) {
      data.activityLog = await ActivityLog.find({
        user,
        ...dateFilter
      }).lean();
    }

    if (includeData.connections !== false) {
      const userData = await User.findById(user)
        .select('followers following friends blockedUsers')
        .populate('followers', 'username fullName')
        .populate('following', 'username fullName')
        .populate('friends', 'username fullName')
        .lean();

      data.connections = {
        followers: userData.followers,
        following: userData.following,
        friends: userData.friends,
        blocked: userData.blockedUsers
      };
    }

    data.exportMetadata = {
      exportedAt: new Date(),
      exportType: job.exportType,
      dataVersion: '1.0'
    };

    return data;
  }

  async createExportFile(job, data) {
    const exportDir = path.join(__dirname, '../exports');
    await fs.mkdir(exportDir, { recursive: true });

    const filename = `export_${job.user}_${Date.now()}`;

    if (job.format === 'json') {
      const filePath = path.join(exportDir, `${filename}.json`);
      await fs.writeFile(filePath, JSON.stringify(data, null, 2));
      return filePath;
    }

    if (job.format === 'zip') {
      const filePath = path.join(exportDir, `${filename}.zip`);
      const output = require('fs').createWriteStream(filePath);
      const archive = archiver('zip', { zlib: { level: 9 } });

      return new Promise((resolve, reject) => {
        output.on('close', () => resolve(filePath));
        archive.on('error', reject);

        archive.pipe(output);
        archive.append(JSON.stringify(data, null, 2), { name: 'data.json' });
        archive.append(JSON.stringify({
          files: ['data.json'],
          exportedAt: new Date(),
          format: 'JSON'
        }, null, 2), { name: 'manifest.json' });

        archive.finalize();
      });
    }

    throw new Error('Unsupported export format');
  }

  async sendExportNotification(job) {
    const emailService = require('./emailService');
    const user = await User.findById(job.user);

    if (user) {
      await emailService.sendEmail({
        to: {
          email: user.email,
          name: user.fullName,
          userId: user._id
        },
        templateKey: 'data_export_ready',
        variables: {
          userName: user.fullName,
          downloadUrl: `${process.env.CLIENT_URL}/download-data/${job.downloadToken}`,
          expiresAt: job.expiresAt.toLocaleString(),
          fileSize: (job.fileSize / (1024 * 1024)).toFixed(2)
        }
      });
    }
  }

  async downloadExport(token) {
    const job = await DataExportJob.findOne({
      downloadToken: token,
      status: 'completed'
    });

    if (!job) {
      throw new Error('Export not found or expired');
    }

    if (new Date() > job.expiresAt) {
      throw new Error('Export has expired');
    }

    if (job.downloadCount >= job.maxDownloads) {
      throw new Error('Maximum download attempts exceeded');
    }

    job.downloadCount += 1;
    await job.save();

    return {
      filePath: job.filePath,
      filename: path.basename(job.filePath),
      size: job.fileSize
    };
  }

  async cleanupExpiredExports() {
    try {
      const expired = await DataExportJob.find({
        expiresAt: { $lt: new Date() },
        status: 'completed'
      });

      for (const job of expired) {
        if (job.filePath) {
          try {
            await fs.unlink(job.filePath);
          } catch (err) {
            logger.error(`Failed to delete file: ${job.filePath}`);
          }
        }

        job.status = 'expired';
        await job.save();
      }

      logger.info(`Cleaned up ${expired.length} expired exports`);
    } catch (error) {
      logger.error('Export cleanup error:', error);
    }
  }
}

module.exports = new DataExportService();
