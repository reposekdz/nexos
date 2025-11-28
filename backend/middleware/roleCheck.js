const logger = require('../utils/logger');

const adminOnly = (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!req.user.isAdmin && req.user.role !== 'admin') {
      logger.warn(`Unauthorized admin access attempt: ${req.user.id}`, {
        path: req.path,
        method: req.method
      });
      return res.status(403).json({ error: 'Admin access required' });
    }

    next();
  } catch (error) {
    logger.error('Admin check error:', error);
    res.status(500).json({ error: error.message });
  }
};

const moderatorOnly = (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const allowedRoles = ['admin', 'moderator'];
    if (!allowedRoles.includes(req.user.role) && !req.user.isAdmin) {
      logger.warn(`Unauthorized moderator access attempt: ${req.user.id}`, {
        path: req.path,
        method: req.method
      });
      return res.status(403).json({ error: 'Moderator access required' });
    }

    next();
  } catch (error) {
    logger.error('Moderator check error:', error);
    res.status(500).json({ error: error.message });
  }
};

const checkRole = (allowedRoles) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      if (!allowedRoles.includes(req.user.role) && !req.user.isAdmin) {
        logger.warn(`Unauthorized access attempt: ${req.user.id}`, {
          path: req.path,
          method: req.method,
          requiredRoles: allowedRoles,
          userRole: req.user.role
        });
        return res.status(403).json({
          error: `Access denied. Required roles: ${allowedRoles.join(', ')}`
        });
      }

      next();
    } catch (error) {
      logger.error('Role check error:', error);
      res.status(500).json({ error: error.message });
    }
  };
};

const verifiedOnly = (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!req.user.verified) {
      return res.status(403).json({
        error: 'Verified account required',
        message: 'This action requires a verified account'
      });
    }

    next();
  } catch (error) {
    logger.error('Verified check error:', error);
    res.status(500).json({ error: error.message });
  }
};

const premiumOnly = (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const premiumStatuses = ['premium', 'pro', 'enterprise'];
    if (!premiumStatuses.includes(req.user.subscriptionTier)) {
      return res.status(403).json({
        error: 'Premium subscription required',
        message: 'This feature is only available to premium subscribers'
      });
    }

    next();
  } catch (error) {
    logger.error('Premium check error:', error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  adminOnly,
  moderatorOnly,
  checkRole,
  verifiedOnly,
  premiumOnly
};