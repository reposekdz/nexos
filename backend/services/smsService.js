const twilio = require('twilio');
const logger = require('../utils/logger');
const User = require('../models/User');

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

class SMSService {
  async sendSMS(phoneNumber, message) {
    try {
      if (!process.env.TWILIO_PHONE_NUMBER) {
        throw new Error('Twilio phone number not configured');
      }

      const result = await client.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phoneNumber
      });

      logger.info(`SMS sent successfully to ${phoneNumber}: ${result.sid}`);
      return {
        success: true,
        sid: result.sid,
        status: result.status
      };
    } catch (error) {
      logger.error('SMS send error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async sendOTP(userId, purpose = 'verification') {
    try {
      const user = await User.findById(userId);
      if (!user || !user.phoneNumber) {
        throw new Error('User phone number not found');
      }

      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const message = `Your Nexos verification code is: ${otp}. Valid for 10 minutes.`;

      const result = await this.sendSMS(user.phoneNumber, message);

      if (result.success) {
        return {
          success: true,
          otp,
          expiresAt: new Date(Date.now() + 10 * 60 * 1000)
        };
      }

      return result;
    } catch (error) {
      logger.error('OTP send error:', error);
      throw error;
    }
  }

  async sendSecurityAlert(userId, alertMessage) {
    try {
      const user = await User.findById(userId);
      if (!user || !user.phoneNumber || !user.settings.notifications.sms) {
        return { success: false, reason: 'SMS notifications disabled' };
      }

      const message = `Nexos Security Alert: ${alertMessage}`;
      return await this.sendSMS(user.phoneNumber, message);
    } catch (error) {
      logger.error('Security alert SMS error:', error);
      throw error;
    }
  }

  async verifyPhoneNumber(phoneNumber, code) {
    try {
      const verification = await client.verify.v2
        .services(process.env.TWILIO_VERIFY_SERVICE_SID)
        .verificationChecks
        .create({ to: phoneNumber, code });

      return {
        success: verification.status === 'approved',
        status: verification.status
      };
    } catch (error) {
      logger.error('Phone verification error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = new SMSService();
