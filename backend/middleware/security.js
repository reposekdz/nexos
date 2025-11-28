const sanitizeHtml = require('sanitize-html');
const mongoSanitize = require('express-mongo-sanitize');
const hpp = require('hpp');
const User = require('../models/User');
const ActivityLog = require('../models/ActivityLog');
const logger = require('../utils/logger');

const sanitizeInput = (req, res, next) => {
  if (req.body) {
    Object.keys(req.body).forEach(key => {
      if (typeof req.body[key] === 'string') {
        req.body[key] = sanitizeHtml(req.body[key], {
          allowedTags: [],
          allowedAttributes: {}
        });
      }
    });
  }
  next();
};

const sanitizeContent = (allowedTags = []) => {
  return (req, res, next) => {
    if (req.body.content) {
      req.body.content = sanitizeHtml(req.body.content, {
        allowedTags: allowedTags.length > 0 ? allowedTags : ['b', 'i', 'em', 'strong', 'a', 'p', 'br'],
        allowedAttributes: {
          'a': ['href', 'target']
        },
        allowedSchemes: ['http', 'https', 'mailto']
      });
    }
    next();
  };
};

const xssProtection = (req, res, next) => {
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:;"
  );
  next();
};

const ageRestriction = (minAge = 13) => {
  return async (req, res, next) => {
    try {
      const user = await User.findById(req.user.id);
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const age = user.getAge();
      
      if (age === null) {
        return res.status(403).json({ 
          error: 'Age verification required',
          code: 'AGE_VERIFICATION_REQUIRED'
        });
      }

      if (age < minAge) {
        await ActivityLog.create({
          user: user._id,
          action: 'age_restricted_access_attempt',
          success: false,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent']
        });

        return res.status(403).json({ 
          error: `This feature requires users to be at least ${minAge} years old`,
          code: 'AGE_RESTRICTED'
        });
      }

      next();
    } catch (error) {
      logger.error('Age restriction check error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
};

const childAccountProtection = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.isMinor) {
      const parentalControl = await require('../models/ParentalControl').findOne({
        childAccount: user._id,
        verificationStatus: 'verified'
      });

      if (!parentalControl) {
        return res.status(403).json({
          error: 'Parental consent required',
          code: 'PARENTAL_CONSENT_REQUIRED'
        });
      }

      const restrictedActions = [
        'create_group',
        'enable_monetization',
        'make_purchase',
        'change_privacy_settings'
      ];

      if (restrictedActions.includes(req.body.action)) {
        return res.status(403).json({
          error: 'This action is restricted for your account',
          code: 'CHILD_ACCOUNT_RESTRICTED'
        });
      }
    }

    next();
  } catch (error) {
    logger.error('Child account protection error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const sessionTimeout = async (req, res, next) => {
  try {
    if (!req.user) return next();

    const user = await User.findById(req.user.id);
    if (!user) return next();

    const sessionTimeout = user.settings.sessionTimeout || 3600;
    const lastActivity = req.session?.lastActivity || Date.now();
    const elapsed = (Date.now() - lastActivity) / 1000;

    if (elapsed > sessionTimeout) {
      req.session.destroy();
      return res.status(401).json({
        error: 'Session expired',
        code: 'SESSION_TIMEOUT'
      });
    }

    req.session.lastActivity = Date.now();
    next();
  } catch (error) {
    logger.error('Session timeout check error:', error);
    next();
  }
};

module.exports = {
  sanitizeInput,
  sanitizeContent,
  xssProtection,
  ageRestriction,
  childAccountProtection,
  sessionTimeout,
  mongoSanitize: mongoSanitize(),
  hpp: hpp()
};
