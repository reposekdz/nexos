const crypto = require('crypto');

const generateETag = (data) => {
  return crypto
    .createHash('md5')
    .update(JSON.stringify(data))
    .digest('hex');
};

const etagMiddleware = (req, res, next) => {
  const originalSend = res.json.bind(res);

  res.json = function(data) {
    if (req.method === 'GET' && res.statusCode === 200) {
      const etag = generateETag(data);
      res.setHeader('ETag', `"${etag}"`);
      res.setHeader('Cache-Control', 'public, max-age=300');

      const clientETag = req.headers['if-none-match'];

      if (clientETag && clientETag === `"${etag}"`) {
        return res.status(304).end();
      }
    }

    return originalSend(data);
  };

  next();
};

const conditionalGet = (req, res, next) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return next();
  }

  const ifModifiedSince = req.headers['if-modified-since'];
  
  if (ifModifiedSince && res.locals.lastModified) {
    const clientDate = new Date(ifModifiedSince);
    const resourceDate = new Date(res.locals.lastModified);

    if (clientDate >= resourceDate) {
      return res.status(304).end();
    }
  }

  next();
};

module.exports = {
  etagMiddleware,
  conditionalGet,
  generateETag
};
