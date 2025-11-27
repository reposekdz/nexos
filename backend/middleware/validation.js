const validator = require('validator');

// Input validation middleware
const validateRegistration = (req, res, next) => {
  const { username, email, password, fullName } = req.body;
  const errors = [];

  if (!username || username.length < 3) errors.push('Username must be at least 3 characters');
  if (!email || !validator.isEmail(email)) errors.push('Valid email required');
  if (!password || password.length < 8) errors.push('Password must be at least 8 characters');
  if (!fullName || fullName.length < 2) errors.push('Full name required');

  if (errors.length > 0) return res.status(400).json({ errors });
  
  req.body.email = validator.normalizeEmail(email);
  req.body.username = validator.escape(username);
  req.body.fullName = validator.escape(fullName);
  
  next();
};

const validateLogin = (req, res, next) => {
  const { email, password } = req.body;
  const errors = [];

  if (!email || !validator.isEmail(email)) errors.push('Valid email required');
  if (!password) errors.push('Password required');

  if (errors.length > 0) return res.status(400).json({ errors });
  
  req.body.email = validator.normalizeEmail(email);
  next();
};

const validatePost = (req, res, next) => {
  const { content } = req.body;
  
  if (!content || content.trim().length === 0) {
    return res.status(400).json({ error: 'Content required' });
  }
  
  if (content.length > 10000) {
    return res.status(400).json({ error: 'Content too long (max 10000 characters)' });
  }
  
  req.body.content = validator.escape(content);
  next();
};

const sanitizeInput = (req, res, next) => {
  Object.keys(req.body).forEach(key => {
    if (typeof req.body[key] === 'string') {
      req.body[key] = validator.escape(req.body[key]);
    }
  });
  next();
};

module.exports = { validateRegistration, validateLogin, validatePost, sanitizeInput };
