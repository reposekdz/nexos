const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');

// Rate limiters
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many login attempts, please try again later'
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests, please try again later'
});

const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 50,
  message: 'Too many uploads, please try again later'
});

// Security middleware
const securityMiddleware = [
  mongoSanitize(),
  xss()
];

// IP tracking
const trackIP = (req, res, next) => {
  req.clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  next();
};

// Suspicious activity detection
const detectSuspiciousActivity = async (req, res, next) => {
  const suspiciousPatterns = [
    /script/i,
    /javascript:/i,
    /onerror/i,
    /onclick/i
  ];

  const checkString = JSON.stringify(req.body);
  const isSuspicious = suspiciousPatterns.some(pattern => pattern.test(checkString));

  if (isSuspicious) {
    return res.status(403).json({ error: 'Suspicious activity detected' });
  }

  next();
};

module.exports = {
  authLimiter,
  apiLimiter,
  uploadLimiter,
  securityMiddleware,
  trackIP,
  detectSuspiciousActivity
};
