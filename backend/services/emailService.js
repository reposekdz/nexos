const sgMail = require('@sendgrid/mail');
const EmailTemplate = require('../models/EmailTemplate');
const EmailQueue = require('../models/EmailQueue');
const logger = require('../utils/logger');

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

class EmailService {
  async sendEmail({ to, templateKey, variables, priority = 'normal', scheduledFor = null }) {
    try {
      const template = await EmailTemplate.findOne({ key: templateKey, isActive: true });
      
      if (!template) {
        throw new Error(`Email template ${templateKey} not found`);
      }

      let subject = template.subject;
      let htmlBody = template.htmlBody;
      let textBody = template.textBody || '';

      Object.keys(variables || {}).forEach(key => {
        const regex = new RegExp(`{{${key}}}`, 'g');
        subject = subject.replace(regex, variables[key]);
        htmlBody = htmlBody.replace(regex, variables[key]);
        textBody = textBody.replace(regex, variables[key]);
      });

      const queueItem = await EmailQueue.create({
        recipient: {
          email: to.email,
          name: to.name,
          userId: to.userId
        },
        template: template._id,
        templateKey,
        subject,
        htmlBody,
        textBody,
        variables,
        priority,
        scheduledFor: scheduledFor || new Date(),
        status: 'pending'
      });

      return queueItem;
    } catch (error) {
      logger.error('Email service error:', error);
      throw error;
    }
  }

  async processQueue() {
    try {
      const emails = await EmailQueue.find({
        status: 'pending',
        scheduledFor: { $lte: new Date() },
        attempts: { $lt: 3 }
      })
      .sort({ priority: -1, createdAt: 1 })
      .limit(50);

      for (const email of emails) {
        await this.sendQueuedEmail(email);
      }
    } catch (error) {
      logger.error('Email queue processing error:', error);
    }
  }

  async sendQueuedEmail(emailDoc) {
    try {
      emailDoc.status = 'processing';
      emailDoc.attempts += 1;
      await emailDoc.save();

      const msg = {
        to: emailDoc.recipient.email,
        from: process.env.EMAIL_FROM || 'noreply@nexos.com',
        subject: emailDoc.subject,
        text: emailDoc.textBody,
        html: emailDoc.htmlBody,
        trackingSettings: {
          clickTracking: { enable: emailDoc.trackingEnabled },
          openTracking: { enable: emailDoc.trackingEnabled }
        }
      };

      const response = await sgMail.send(msg);

      emailDoc.status = 'sent';
      emailDoc.sentAt = new Date();
      emailDoc.providerResponse = response[0];
      await emailDoc.save();

      logger.info(`Email sent successfully to ${emailDoc.recipient.email}`);
      return true;
    } catch (error) {
      emailDoc.status = 'failed';
      emailDoc.failedAt = new Date();
      emailDoc.error = error.message;
      await emailDoc.save();

      logger.error(`Email send failed: ${error.message}`);
      return false;
    }
  }

  async trackOpen(emailId, ipAddress, userAgent) {
    try {
      await EmailQueue.findByIdAndUpdate(emailId, {
        $push: {
          opens: {
            timestamp: new Date(),
            ipAddress,
            userAgent
          }
        }
      });
    } catch (error) {
      logger.error('Email open tracking error:', error);
    }
  }

  async trackClick(emailId, url, ipAddress, userAgent) {
    try {
      await EmailQueue.findByIdAndUpdate(emailId, {
        $push: {
          clicks: {
            url,
            timestamp: new Date(),
            ipAddress,
            userAgent
          }
        }
      });
    } catch (error) {
      logger.error('Email click tracking error:', error);
    }
  }

  async sendDigest(userId, content) {
    const user = await require('../models/User').findById(userId);
    if (!user || !user.settings.notifications.email) return;

    return this.sendEmail({
      to: {
        email: user.email,
        name: user.fullName,
        userId: user._id
      },
      templateKey: 'weekly_digest',
      variables: {
        userName: user.fullName,
        content: content,
        unsubscribeUrl: `${process.env.CLIENT_URL}/settings/notifications`
      },
      priority: 'low'
    });
  }
}

module.exports = new EmailService();
